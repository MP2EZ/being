/**
 * Wellness-data write-site ratchet (FEAT-664, FEAT-318 slice A1).
 *
 * FEAT-318 enforces the Art. 9(2)(a) choice at every place wellness data is
 * WRITTEN. It can only be closed if "every place" is a set, not a memory — so
 * this suite scans `app/src` (plus `App.tsx`) for storage-write primitives and
 * fails on any site the manifest below does not classify, and on any row the code
 * no longer backs. FEAT-318 closes when no row says `pending`.
 *
 * DISPOSITIONS
 *   gated               — calls `decideWellnessWrite` before writing
 *   pending: A2|B|C     — a live wellness write its slice will gate
 *   exempt: <reason>    — never gated, with the reason:
 *     not wellness data, consent record (lawful-basis evidence), crisis telemetry
 *     (vital interest, INFRA-214), erasure (a refusing user must still be able to
 *     delete), DSR export, storage-layer internals, or dormant — "gate before
 *     reviving": no production caller today, so a revival must add the gate.
 *
 * GRANULARITY. A site is file + enclosing function chain + primitive, with a
 * count, so line churn is free but a new write — even a second one in a listed
 * function — must be classified. Chokepoints carry their callers: a new caller of
 * a gated chokepoint is covered; a new write primitive anywhere is not.
 *
 * WHAT IT CANNOT SEE: raw `fetch`, native modules, and a primitive reached through
 * an alias (`const { setItem } = AsyncStorage`). A writer shaped like that is
 * invisible here and must be listed by hand.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import * as ts from 'typescript';

const APP = join(__dirname, '../..');

type Slice = 'A2' | 'B' | 'C';
type Disposition = 'gated' | `pending: ${Slice}` | `exempt: ${string}`;
type Row = readonly [count: number, disposition: Disposition, note?: string];

const NOT_WELLNESS = 'exempt: not wellness data';
const CONSENT_RECORD = 'exempt: consent record — lawful-basis evidence, not wellness data';
const CRISIS_TELEMETRY = 'exempt: crisis telemetry — vital-interest basis (INFRA-214)';
const ERASURE = 'exempt: erasure — withholding consent must never block deletion';
const STORAGE_LAYER = 'exempt: storage-layer internals — callers are classified at their call sites';
const DORMANT = 'exempt: dormant, no production caller — gate before reviving';
/** Live since App.tsx:157 — the 2026-09-26 inventory's "DataRetentionService is dormant" is stale for pruning. */
const RETENTION = 'exempt: erasure — retention pruning of expired records';

/** Keyed by file, then `<enclosing function chain> › <primitive>`. */
const MANIFEST: Record<string, Record<string, Row>> = {
  // ── Live wellness writes: FEAT-318 slices ────────────────────────────────
  'src/features/assessment/stores/assessmentStore.ts': {
    'EncryptedAssessmentStorage.save › storeWellnessBlob': [
      1,
      'pending: A2',
      'THE screening chokepoint: persist setItem, saveProgress, answerQuestion, completeAssessment, setSessionNote and handleCrisisDetection all land here. Erasure (clearHistory, clearSessionNote, resetAssessment) routes through it too and must stay ungated.',
    ],
    'useAssessmentStore › persist': [1, 'pending: A2', 'storage adapter is EncryptedAssessmentStorage.save'],
    'EncryptedAssessmentStorage.applyErasure › storeWellnessBlob': [
      1,
      ERASURE,
      'FEAT-717: rewrites the on-disk blob minus one deletion (clear_history, clear_session_note, reset_current_session); reads disk, never memory. Unwired until FEAT-685.',
    ],
    'EncryptedAssessmentStorage.logAccess › AsyncStorage.setItem': [
      1,
      `${NOT_WELLNESS} — access metadata {timestamp, action, itemCount, source}`,
      'rides the A2 chokepoint; its SAVE timestamps do record WHEN screenings happen — A2 to rule whether a blocked save still logs',
    ],
  },
  'src/features/journal/services/journalEntryStore.ts': {
    'saveEntry › storeWellnessBlob': [1, 'pending: B'],
    'writeIndex › storeWellnessBlob': [
      1,
      'pending: B',
      'index row after saveEntry; also reached from deleteEntry, which is erasure',
    ],
  },
  'src/features/practices/stores/stoicPracticeStore.ts': {
    'persistToSecureStore › setItemAsync': [
      1,
      'gated',
      'FEAT-667: whole-blob chokepoint (check-ins, principle engagement daily and learn, weekly reflection text). Skips the write when blocked; a record captured while blocked is never written; `loading` defers. Erasure: resetStore.',
    ],
  },
  'src/core/services/session/SessionStorageService.ts': {
    'SessionStorageService.saveSession › setItemAsync': [
      1,
      'gated',
      'FEAT-667: daily-loop beat responses. A blocked save writes nothing and latches until clearSession. useFlowSessionResumption is a dormant caller.',
    ],
    'SessionStorageService.markSessionCompleted › setItemAsync': [1, DORMANT],
  },

  // ── Exempt by rule ───────────────────────────────────────────────────────
  'src/features/profile/screens/ExportDataScreen.tsx': {
    'ExportDataScreen.handleExport › new File': [
      1,
      'exempt: DSR export — a data-subject right, must never be gated',
    ],
  },
  'src/core/services/supabase/SupabaseService.ts': {
    'SupabaseService.flushCrisisAnalytics.flight › supabase.insert': [1, CRISIS_TELEMETRY],
    'SupabaseService.persistCrisisQueue.run › AsyncStorage.setItem': [1, CRISIS_TELEMETRY],
    'SupabaseService.deleteAccount › functions.invoke': [1, ERASURE],
    'SupabaseService.flushAnalytics › supabase.insert': [
      1,
      `${NOT_WELLNESS} — cloud-sync operational telemetry`,
      'backup completed/failed/restored counts; gated on cloud_sync consent',
    ],
    'SupabaseService.saveBackup › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — last-sync timestamp`],
    'SupabaseService.saveBackup › supabase.upsert': [
      1,
      `${NOT_WELLNESS} — CloudBackupService payload, uploads only {autoSaveEnabled}`,
      'encrypted; the allowlist is pinned by the spec below',
    ],
    'SupabaseService.queueOfflineOperation › AsyncStorage.setItem': [
      1,
      `${NOT_WELLNESS} — encrypted config-backup retry`,
      'unverified: a pre-MAINT-117 queue on an old install could still hold a full-state blob; the key is swept at erasure (DEBUG-698: SWEPT_EXACT_KEYS + in-memory reset)',
    ],
    'SupabaseService.processOfflineQueue › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — encrypted config-backup retry`],
    'SupabaseService.cleanup › AsyncStorage.setItem': [1, DORMANT],
    'SupabaseService.requestBackupDeletion › AsyncStorage.setItem': [
      2,
      ERASURE,
      'DEBUG-764: the pending server-backup delete {uid, requestedAt} and the offline queue minus pre-withdrawal snapshots; the pending key is swept at erasure (SWEPT_EXACT_KEYS + in-memory reset)',
    ],
  },
  'src/core/services/supabase/CloudBackupService.ts': {
    'CloudBackupService.createBackup › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — backup metadata {timestamp, hash, size}`],
    'CloudBackupService.saveConfig › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — backup config`],
  },
  'src/core/services/data-retention/DataRetentionService.ts': {
    'DataRetentionServiceImpl.cleanupAssessmentData › storeWellnessBlob': [
      1,
      RETENTION,
      'rewrites the live assessment_store blob minus expired screenings (DEBUG-705); was the legacy key, which pruned nothing live',
    ],
    'DataRetentionServiceImpl.cleanupStoicPracticeData › setItemAsync': [
      1,
      RETENTION,
      'rewrites the live stoic_practice_state blob minus expired entries — the key slice C gates at persistToSecureStore',
    ],
    'DataRetentionServiceImpl.deleteDataCategory › setItemAsync': [2, DORMANT, 'erasure-shaped'],
    'DataRetentionServiceImpl.deleteDataCategory › storeWellnessBlob': [
      1,
      DORMANT,
      'erasure-shaped: clears assessment history on the live blob (DEBUG-705)',
    ],
    'DataRetentionServiceImpl.cleanupOldAuditLogs › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — retention audit metadata`],
    'DataRetentionServiceImpl.runRetentionCleanup › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — retention audit metadata`],
    'DataRetentionServiceImpl.saveAuditEntry › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — retention audit metadata`],
  },
  'src/core/stores/consentStore.ts': {
    'persistConsentHistory › storeWellnessBlob': [
      1,
      'exempt: consent-history write via storeWellnessBlob — the Art. 7(1) audit chain',
    ],
    'recordLegalGateConsents › setItemAsync': [1, CONSENT_RECORD],
    'useConsentStore.grantConsent › setItemAsync': [1, CONSENT_RECORD],
    'useConsentStore.grantConsent › AsyncStorage.setItem': [1, CONSENT_RECORD, 'consent cache'],
    'useConsentStore.updateConsent › setItemAsync': [1, CONSENT_RECORD],
    'useConsentStore.updateConsent › AsyncStorage.setItem': [1, CONSENT_RECORD, 'consent cache'],
    'useConsentStore.renewConsent › setItemAsync': [1, CONSENT_RECORD],
    'useConsentStore.renewConsent › AsyncStorage.setItem': [1, CONSENT_RECORD, 'consent cache'],
    'useConsentStore.revokeConsent › setItemAsync': [1, CONSENT_RECORD],
    'useConsentStore.setUniversalOptOut › setItemAsync': [1, CONSENT_RECORD],
    'useConsentStore.setUniversalOptOut › AsyncStorage.setItem': [1, CONSENT_RECORD, 'consent cache'],
    'useConsentStore.verifyAge › setItemAsync': [1, CONSENT_RECORD, 'age verification'],
    'useConsentStore.loadConsent › AsyncStorage.setItem': [1, CONSENT_RECORD, 'consent cache'],
    'loadConsentHistoryWithMigration › AsyncStorage.setItem': [2, CONSENT_RECORD, 'migration flag'],
    '__seedStaleConsentRecordForE2E › setItemAsync': [1, CONSENT_RECORD, 'e2e-sim seed seam'],
    'useConsentStore.recordAccountDeletionAttestation › setItemAsync': [2, ERASURE, 'Art. 17(3)(b) attestation'],
    'backfillDeletionAttestation › setItemAsync': [1, ERASURE, 'Art. 17(3)(b) attestation'],
    'backfillDeletionAttestationFromHistory › setItemAsync': [1, ERASURE, 'Art. 17(3)(b) attestation'],
  },
  'src/core/services/security/SecureStorageService.ts': {
    'SecureStorageService.storeWellnessBlob › AsyncStorage.setItem': [1, STORAGE_LAYER],
    'SecureStorageService.storeAssessmentData › AsyncStorage.setItem': [1, STORAGE_LAYER, 'no production caller'],
    'SecureStorageService.storeGeneralData › AsyncStorage.setItem': [2, STORAGE_LAYER, 'no production caller'],
    'SecureStorageService.readWithLegacyFallback › AsyncStorage.setItem': [
      1,
      STORAGE_LAYER,
      'relocates ciphertext already stored (INFRA-144); blocking it would lose data',
    ],
    'SecureStorageService.markMigrated › AsyncStorage.setItem': [1, STORAGE_LAYER, 'migration flag'],
    'SecureStorageService.persistMetadataIndex › AsyncStorage.setItem': [1, STORAGE_LAYER, 'key/size metadata'],
    'SecureStorageService.logStorageAccess › AsyncStorage.setItem': [1, STORAGE_LAYER, 'failed-op metadata, no payload'],
    'SecureStorageService.verifyStorageCapabilities › AsyncStorage.setItem': [1, STORAGE_LAYER, 'probe write'],
    'SecureStorageService.verifyStorageCapabilities › setItemAsync': [1, STORAGE_LAYER, 'probe write'],
  },
  'src/core/services/security/EncryptionService.ts': {
    'EncryptionService.initializeMasterKey › setItemAsync': [1, `${NOT_WELLNESS} — key material`],
    'EncryptionService.rotateKey › setItemAsync': [1, `${NOT_WELLNESS} — key material`],
    'EncryptionService.migrateLegacyEncryptedData › setItemAsync': [1, `${NOT_WELLNESS} — migration flag`],
    'EncryptionService.generateSecureDeviceId › setItemAsync': [1, `${NOT_WELLNESS} — device id`],
  },

  // ── Not wellness data ────────────────────────────────────────────────────
  'src/core/stores/settingsStore.ts': {
    'reassertCurrentSettings › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings (DEBUG-755 stale-writer convergence)`],
    'useSettingsStore.loadSettings › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
    'useSettingsStore.markOnboardingComplete › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
    'useSettingsStore.resetSettings › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
    'useSettingsStore.setLastActiveTimestamp › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
    'useSettingsStore.updateAccessibilitySettings › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
    'useSettingsStore.updateNotificationSettings › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
    'useSettingsStore.updatePracticeSettings › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
    'useSettingsStore.updatePrivacySettings › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — app settings`],
  },
  'src/core/stores/subscriptionStore.ts': {
    'useSubscriptionStore.createTrial › setItemAsync': [1, `${NOT_WELLNESS} — entitlement`],
    'useSubscriptionStore.enterGracePeriod › setItemAsync': [1, `${NOT_WELLNESS} — entitlement`],
    'useSubscriptionStore.exitGracePeriod › setItemAsync': [1, `${NOT_WELLNESS} — entitlement`],
    'useSubscriptionStore.processVerifiedPurchase › setItemAsync': [1, `${NOT_WELLNESS} — entitlement`],
    'useSubscriptionStore.updateSubscriptionStatus › setItemAsync': [1, `${NOT_WELLNESS} — entitlement`],
  },
  'src/core/services/subscription/IAPService.ts': {
    'IAPServiceClass.verifyReceipt › functions.invoke': [2, `${NOT_WELLNESS} — purchase receipt`],
  },
  'src/core/services/supabase/secureStoreSessionAdapter.ts': {
    'createSecureStoreSessionAdapter.setItem › setItemAsync': [2, `${NOT_WELLNESS} — Supabase auth session`],
  },
  'src/core/services/supabase/ErrorHandler.ts': {
    'CloudSyncErrorHandler.saveErrorHistory › AsyncStorage.setItem': [
      1,
      DORMANT,
      'no importer; writes raw error.message and an unsanitized context',
    ],
  },
  'src/core/services/monitoring/ErrorMonitoringService.ts': {
    'ErrorMonitoringService.storeAlertEvent › AsyncStorage.setItem': [
      1,
      `${NOT_WELLNESS} — sanitized alert counts`,
      'reached only through CircuitBreaker.execute, which has no production caller',
    ],
  },
  'src/core/services/resilience/CircuitBreakerService.ts': {
    'CircuitBreaker.queueForRetry › AsyncStorage.setItem': [
      1,
      DORMANT,
      'queues an untyped, unsanitized caller context',
    ],
  },
  'src/core/analytics/appLifecycleTelemetry.ts': {
    'consumeColdStart › AsyncStorage.setItem': [1, `${NOT_WELLNESS} — first-open marker`],
  },
  'src/core/analytics/analyticsIdentityReset.ts': {
    'resetAnalyticsIdentity › new File': [1, ERASURE, 'the File handle is only used to delete'],
  },
};

// ── Scanner ────────────────────────────────────────────────────────────────

const ASYNC_STORAGE_WRITES = new Set(['setItem', 'multiSet', 'mergeItem', 'multiMerge']);
const WELLNESS_SERVICE_WRITES = new Set(['storeWellnessBlob', 'storeAssessmentData', 'storeGeneralData']);
const SUPABASE_WRITES = new Set(['insert', 'upsert', 'update']);

/** The write primitive a node invokes, or null. */
function primitiveOf(node: ts.Node): string | null {
  if (ts.isNewExpression(node)) {
    // expo-file-system: every file write starts from `new File(...)`.
    return ts.isIdentifier(node.expression) && node.expression.text === 'File' ? 'new File' : null;
  }
  if (!ts.isCallExpression(node)) return null;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    // `persist(` covers a store persisting via createJSONStorage(() => AsyncStorage),
    // which contains no literal setItem call.
    if (callee.text === 'persist') return 'persist';
    if (callee.text === 'setItemAsync') return 'setItemAsync';
    return null;
  }
  if (!ts.isPropertyAccessExpression(callee)) return null;
  const method = callee.name.text;
  const receiver = callee.expression.getText();
  if (method === 'setItemAsync') return 'setItemAsync';
  if (ASYNC_STORAGE_WRITES.has(method) && /AsyncStorage$/.test(receiver)) return `AsyncStorage.${method}`;
  if (WELLNESS_SERVICE_WRITES.has(method)) return method;
  if (SUPABASE_WRITES.has(method) && /\.from\(/.test(receiver)) return `supabase.${method}`;
  if (method === 'invoke' && /(?:^|\.)functions$/.test(receiver)) return 'functions.invoke';
  return null;
}

/** Name a function-like node, looking through wrappers like `useCallback(async () => …)`. */
function nameOf(node: ts.Node): string | null {
  if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name?.getText() ?? null;
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    let parent = node.parent;
    while (parent && (ts.isCallExpression(parent) || ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent))) {
      parent = parent.parent;
    }
    if (
      parent &&
      (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent))
    ) {
      return parent.name.getText();
    }
  }
  return null;
}

function siteOf(node: ts.Node): string {
  const chain: string[] = [];
  for (let n = node.parent; n; n = n.parent) {
    const name = nameOf(n);
    if (name && chain[0] !== name) chain.unshift(name);
  }
  if (chain.length) return chain.join('.');
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isVariableDeclaration(n)) return n.name.getText();
  }
  return '<module>';
}

/** `{ '<site> › <primitive>': count }` for one source file. */
function scanSource(fileName: string, source: string): Record<string, number> {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const sites: Record<string, number> = {};
  const visit = (node: ts.Node): void => {
    const primitive = primitiveOf(node);
    if (primitive) {
      const key = `${siteOf(node)} › ${primitive}`;
      sites[key] = (sites[key] ?? 0) + 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
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

function censusOfApp(): Record<string, Record<string, number>> {
  const census: Record<string, Record<string, number>> = {};
  for (const file of [...sourceFiles(join(APP, 'src')), join(APP, 'App.tsx')]) {
    const sites = scanSource(file, readFileSync(file, 'utf8'));
    if (Object.keys(sites).length) census[relative(APP, file)] = sites;
  }
  return census;
}

const flatten = <T>(byFile: Record<string, Record<string, T>>): Map<string, T> =>
  new Map(
    Object.entries(byFile).flatMap(([file, sites]) =>
      Object.entries(sites).map(([site, value]) => [`${file} :: ${site}`, value] as [string, T]),
    ),
  );

const CENSUS = flatten(censusOfApp());
const LISTED = flatten(MANIFEST);

// ── Specs ──────────────────────────────────────────────────────────────────

describe('the scanner', () => {
  it('recognises every primitive shape, names its site, and ignores look-alikes', () => {
    const fixture = `
      class Svc { async a() { await SecureStore.setItemAsync('k', v); } }
      export async function b() {
        await AsyncStorage.setItem('k', v);
        await AsyncStorage.multiSet([]);
        await AsyncStorage.getItem('k');
        cache.setItem('k', v);
      }
      const useX = create(persist((set) => ({
        c: async () => { await SecureStorageService.storeWellnessBlob('k', v, 'l'); },
      }), {}));
      function d() { const f = new File(Paths.cache, 'x'); new Map(); }
      async function e() {
        await client.from('t').insert({});
        await client.from('t').select('*');
        await client.functions.invoke('fn');
        other.update({});
      }
      function Screen() { const h = useCallback(async () => { await AsyncStorage.mergeItem('k', 'v'); }, []); }
    `;
    expect(scanSource('fixture.tsx', fixture)).toEqual({
      'Svc.a › setItemAsync': 1,
      'b › AsyncStorage.setItem': 1,
      'b › AsyncStorage.multiSet': 1,
      'useX › persist': 1,
      'useX.c › storeWellnessBlob': 1,
      'd › new File': 1,
      'e › supabase.insert': 1,
      'e › functions.invoke': 1,
      'Screen.h › AsyncStorage.mergeItem': 1,
    });
  });

  it('finds the known wellness chokepoints in the real tree', () => {
    for (const site of [
      'src/features/assessment/stores/assessmentStore.ts :: EncryptedAssessmentStorage.save › storeWellnessBlob',
      'src/features/journal/services/journalEntryStore.ts :: saveEntry › storeWellnessBlob',
      'src/features/practices/stores/stoicPracticeStore.ts :: persistToSecureStore › setItemAsync',
      'src/core/services/session/SessionStorageService.ts :: SessionStorageService.saveSession › setItemAsync',
    ]) {
      expect(CENSUS.has(site)).toBe(true);
    }
  });

  it('flags a write the manifest does not list (positive control)', () => {
    const unlisted = scanSource(
      'src/features/newFeature/store.ts',
      'export async function saveMood() { await AsyncStorage.setItem("mood", v); }',
    );
    const key = `src/features/newFeature/store.ts :: ${Object.keys(unlisted)[0]}`;
    expect(key).toBe('src/features/newFeature/store.ts :: saveMood › AsyncStorage.setItem');
    expect(LISTED.has(key)).toBe(false);
  });
});

describe('the manifest', () => {
  it('lists every write site in app/src, at its current count', () => {
    const drift = [...CENSUS]
      .filter(([site, count]) => LISTED.get(site)?.[0] !== count)
      .map(([site, count]) => `${site} — found ${count}, listed ${LISTED.get(site)?.[0] ?? 'nothing'}`);
    expect(drift).toEqual([]);
  });

  it('has no row the code no longer backs', () => {
    expect([...LISTED.keys()].filter((site) => !CENSUS.has(site))).toEqual([]);
  });

  it('gives every row a well-formed disposition', () => {
    const malformed = [...LISTED]
      .filter(([, [, disposition]]) => !/^(?:gated|pending: (?:A2|B|C)|exempt: \S.*)$/.test(disposition))
      .map(([site]) => site);
    expect(malformed).toEqual([]);
  });

  it('keeps the CloudBackupService exemption as narrow as its reason says', () => {
    // The upload is exempt ONLY because it carries {autoSaveEnabled}. Nothing else
    // pins the upload's keys (CloudBackupService.privacy.test.ts pins restore), so
    // a widened allowlist would stay exempt here while shipping wellness data.
    const file = join(APP, 'src/core/services/supabase/CloudBackupService.ts');
    const sourceFile = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const literalKeys: Record<string, string[]> = {};
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
        literalKeys[node.name.getText()] = node.initializer.properties.map((p) => p.name?.getText() ?? '<spread>');
        for (const p of node.initializer.properties) {
          if (ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) {
            literalKeys[`${node.name.getText()}.${p.name.getText()}`] = p.initializer.properties.map(
              (q) => q.name?.getText() ?? '<spread>',
            );
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(literalKeys['filteredAssessmentData']).toEqual(['autoSaveEnabled']);
    expect(literalKeys['backupPayload.stores']).toEqual(['assessment']);
  });

  it('marks every dormant site "gate before reviving"', () => {
    const dormant = [...LISTED].filter(([, [, disposition]]) => disposition.includes('dormant'));
    expect(dormant.length).toBeGreaterThan(0);
    for (const [, [, disposition]] of dormant) expect(disposition).toContain('gate before reviving');
  });
});
