/**
 * Art. 9 wellness-write predicate stays off the crisis path (FEAT-664, crisis ruling 2026-09-26).
 *
 * `decideWellnessWrite` gates WRITES of wellness data. The founder-settled rule
 * from FEAT-318 is "gate the write, never the capture": a user who refused Art. 9
 * consent must still be asked Q9, still get `handleCrisisDetection`, still have
 * the journal's `scanOnSave` run, and still reach 988. An entry-gate kills every
 * one of those; a write-gate kills none. So the predicate must never be read by
 * crisis-owned code, by the crisis-telemetry sink, by a render ancestor of the
 * crisis subtree, or by a screen where the user answers or writes — a render-time
 * gate there would block capture.
 *
 * FEAT-717 (FEAT-665 slice A2a-ii, AC4): the readers are now an ALLOWLIST built from
 * current code, so a new reader anywhere fails here and needs a ruling, not just a new
 * file outside the banned set. `assessmentStore.ts` is pre-listed: FEAT-685 gates
 * `EncryptedAssessmentStorage.save` there and deletes the "does not read it yet" pin.
 * `journalEntryStore.ts` (slice B) is not listed yet; it joins in the PR that gates it.
 * The hard bans below still apply and may never intersect the allowlist. A one-hop rule
 * keeps the predicate from leaking through an allowlisted module: none re-exports it,
 * none but consentStore exports a binding that returns the decision, and no other
 * importer of an allowlisted module reads it.
 *
 * Matches the BARE identifier over comment-stripped source, not an import-shaped
 * pattern: SupabaseService already imports `useConsentStore`, so an import-only
 * regex would miss a store-member or namespace read (DEBUG-390).
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';
import * as ts from 'typescript';

const APP = join(__dirname, '../..');
const SRC = join(APP, 'src');
const CONSENT_STORE = join(SRC, 'core/stores/consentStore.ts');
const ASSESSMENT_STORE = join(SRC, 'features/assessment/stores/assessmentStore.ts');

/** Every non-test source file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === '__mocks__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Strip block and line comments before matching (DEBUG-390). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const stripped = (file: string): string => stripComments(readFileSync(file, 'utf8'));
const label = (file: string): string => relative(APP, file);

const PREDICATE = /\bdecideWellnessWrite\b/;

const ALL_FILES = [...sourceFiles(SRC), join(APP, 'App.tsx')];

const CRISIS_FEATURE_FILES = sourceFiles(join(SRC, 'features/crisis'));
const NAVIGATION_FILES = sourceFiles(join(SRC, 'core/navigation'));

const NAMED_FILES = [
  // Crisis telemetry: CRISIS_ANALYTICS_QUEUE, trackCrisisDetection, flush and
  // ensureClient all live in SupabaseService; there is no separate queue module.
  'src/core/services/supabase/SupabaseService.ts',
  'src/features/journal/services/journalCrisisScan.ts',
  'App.tsx', // fires initializeCrisisTelemetry
  // Render ancestors of the crisis subtree (DEBUG-559 class).
  'src/core/analytics/PostHogProvider.tsx',
  // Screens where the user answers or writes.
  'src/features/journal/screens/VoiceReflectionScreen.tsx',
  'src/features/assessment/components/EnhancedAssessmentFlow.tsx',
  'src/features/assessment/components/EnhancedAssessmentQuestion.tsx',
  'src/features/assessment/components/AssessmentResults.tsx',
  // FEAT-667 (crisis ruling 2026-09-29): the daily loop's capture path, which hosts
  // SUPPORT_LINE, and the weekly-reflection composer. Slice C gates below them, at
  // SessionStorageService and stoicPracticeStore. WeeklyReflectionCard may read the
  // predicate as a display-only notice host and hands the composer a prop.
  'src/features/practices/dailyloop/DailyLoopNavigator.tsx',
  'src/features/practices/dailyloop/screens/DailyLoopStepScreen.tsx',
  'src/features/practices/dailyloop/screens/DailyLoopCompleteScreen.tsx',
  'src/features/practices/dailyloop/config/tenseMode.ts',
  'src/features/insights/components/WeeklyReflectionComposer.tsx',
  // FEAT-669 (crisis ruling 2026-10-03): DailyLoopDepthSelectScreen, DotCalendar and
  // PrincipleEngagementChart join WeeklyReflectionCard as display-only notice hosts.
  // These three may NOT read the predicate: WellnessScreeningTrends hosts the inline
  // 988 link and publishes SessionNoteComposer into the root slot; SessionNoteComposer
  // is a write surface on CrisisTextInput; InsightsScreen is a render ancestor of both.
  'src/features/insights/components/WellnessScreeningTrends.tsx',
  'src/features/insights/components/SessionNoteComposer.tsx',
  'src/features/insights/screens/InsightsScreen.tsx',
].map((file) => join(APP, file));

const GUARDED_FILES = [...CRISIS_FEATURE_FILES, ...NAVIGATION_FILES, ...NAMED_FILES];

/**
 * Every file allowed to read the predicate (FEAT-717 AC4), verified by grep at the
 * FEAT-717 base. `educationStore` is deliberately absent: it stopped reading the
 * predicate in DEBUG-672. A new reader needs a `crisis` ruling and a row here.
 */
const PREDICATE_ALLOWLIST = [
  'src/core/stores/consentStore.ts', // defines it
  'src/features/assessment/stores/assessmentStore.ts', // pre-listed: FEAT-685 gates the save
  'src/features/assessment/components/AssessmentStorageExplainer.tsx', // FEAT-717 leaf, unwired
  'src/core/services/session/SessionStorageService.ts', // FEAT-667 gate
  'src/features/practices/stores/stoicPracticeStore.ts', // FEAT-667 gate
  'src/features/insights/components/WeeklyReflectionCard.tsx', // FEAT-667 notice host
  'src/features/insights/components/DotCalendar.tsx', // FEAT-669 notice host
  'src/features/insights/components/PrincipleEngagementChart.tsx', // FEAT-669 notice host
  'src/features/practices/dailyloop/screens/DailyLoopDepthSelectScreen.tsx', // FEAT-669 notice host
  // DEBUG-699 (crisis + philosopher ruling 2026-10-06): the resume prompt is the only screen
  // between a restored session and its first beat, so it hosts the same display-only note.
  // DailyLoopNavigator stays in NAMED_FILES: it neither reads the predicate nor passes it down.
  'src/features/practices/shared/components/ResumeSessionModal.tsx', // DEBUG-699 notice host
].map((file) => join(APP, file));

/** Listed ahead of its reader. FEAT-685 removes this entry when it wires the gate. */
const PRE_LISTED = [ASSESSMENT_STORE];

describe('the scan is actually scanning', () => {
  it('walks the crisis feature and navigation directories', () => {
    expect(CRISIS_FEATURE_FILES.length).toBeGreaterThanOrEqual(17);
    expect(NAVIGATION_FILES.some((f) => f.endsWith('CleanRootNavigator.tsx'))).toBe(true);
  });

  it.each(NAMED_FILES.map((f) => [label(f), f]))('%s exists', (_label, file) => {
    expect(existsSync(file)).toBe(true);
  });

  it.each(GUARDED_FILES.map((f) => [label(f), f]))(
    '%s still has code after comment stripping',
    (_label, file) => {
      // `export`, not just `import`: leaf modules (textCrisisDetection, tabBarLayout) import nothing.
      expect(stripped(file)).toMatch(/\b(?:import|export)\b/);
    },
  );

  it('the matcher fires on the stripped source of the module that defines it', () => {
    expect(stripped(CONSENT_STORE)).toMatch(PREDICATE);
  });
});

describe('no crisis-path file reads the wellness-write predicate', () => {
  it.each(GUARDED_FILES.map((f) => [label(f), f]))('%s', (_label, file) => {
    expect(stripped(file)).not.toMatch(PREDICATE);
  });
});

describe('the predicate has an allowlist (FEAT-717 AC4)', () => {
  it('no file in app/src or App.tsx outside the allowlist reads it', () => {
    expect(ALL_FILES.length).toBeGreaterThan(100);
    const offenders = ALL_FILES.filter((f) => !PREDICATE_ALLOWLIST.includes(f))
      .filter((f) => PREDICATE.test(stripped(f)))
      .map(label);
    expect(offenders).toEqual([]);
  });

  it('positive control: a reader outside the allowlist would be caught', () => {
    const planted = 'import { decideWellnessWrite } from "@/core/stores/consentStore";\nconst d = decideWellnessWrite();';
    expect(PREDICATE.test(stripComments(planted))).toBe(true);
    // ...and a comment naming it is not a read.
    expect(PREDICATE.test(stripComments('// decideWellnessWrite is not read here\nexport {};'))).toBe(false);
  });

  it('the hard bans never intersect the allowlist', () => {
    expect(GUARDED_FILES.length).toBeGreaterThan(NAMED_FILES.length);
    expect(GUARDED_FILES.filter((f) => PREDICATE_ALLOWLIST.includes(f)).map(label)).toEqual([]);
  });

  it('educationStore is not allowlisted (DEBUG-672)', () => {
    expect(PREDICATE_ALLOWLIST.some((f) => /educationStore/.test(f))).toBe(false);
  });

  it.each(PREDICATE_ALLOWLIST.filter((f) => !PRE_LISTED.includes(f)).map((f) => [label(f), f]))(
    '%s exists and reads the predicate (no stale rows)',
    (_label, file) => {
      expect(existsSync(file)).toBe(true);
      expect(stripped(file)).toMatch(PREDICATE);
    },
  );

  it('assessmentStore exists and does not read the predicate yet (FEAT-685 deletes this)', () => {
    expect(existsSync(ASSESSMENT_STORE)).toBe(true);
    expect(stripped(ASSESSMENT_STORE)).not.toMatch(PREDICATE);
  });
});

// ── One-hop rule ───────────────────────────────────────────────────────────

const PREDICATE_NAME = 'decideWellnessWrite';
const DECISION_TYPE = /\bWellnessWriteDecision\b/;

const parse = (fileName: string, source: string): ts.SourceFile =>
  ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

const hasExport = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

const isPredicateCall = (node: ts.Node | undefined): boolean =>
  !!node &&
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === PREDICATE_NAME;

/** Names a re-export of the predicate: `export { decideWellnessWrite }`, `export *` from consentStore, etc. */
function reExportsOf(sf: ts.SourceFile): string[] {
  const found: string[] = [];
  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt)) {
      const from = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : '';
      if (!stmt.exportClause && /consentStore$/.test(from)) found.push(`export * from '${from}'`);
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          if ((el.propertyName ?? el.name).text === PREDICATE_NAME) found.push(`export { ${el.getText()} }`);
        }
      }
      if (stmt.exportClause && ts.isNamespaceExport(stmt.exportClause) && /consentStore$/.test(from)) {
        found.push(`export * as ${stmt.exportClause.name.text}`);
      }
    }
    if (ts.isExportAssignment(stmt)) {
      const e = stmt.expression;
      if ((ts.isIdentifier(e) && e.text === PREDICATE_NAME) || isPredicateCall(e)) found.push('export default');
    }
    if (ts.isVariableStatement(stmt) && hasExport(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (d.initializer && ts.isIdentifier(d.initializer) && d.initializer.text === PREDICATE_NAME) {
          found.push(`export const ${d.name.getText()} = ${PREDICATE_NAME}`);
        }
      }
    }
  }
  return found;
}

/** Does this function hand the decision back: a declared decision return type, or a top-level `return decideWellnessWrite()` / of a local bound to it? */
function returnsDecision(fn: ts.SignatureDeclaration): boolean {
  if (fn.type && DECISION_TYPE.test(fn.type.getText())) return true;
  const body = (fn as ts.FunctionLikeDeclarationBase).body;
  if (!body) return false;
  if (!ts.isBlock(body)) return isPredicateCall(body);
  const boundToDecision = new Set<string>();
  let returns = false;
  const visit = (node: ts.Node): void => {
    if (node !== body && ts.isFunctionLike(node)) return; // nested functions are not this function's return
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isPredicateCall(node.initializer)) {
      boundToDecision.add(node.name.text);
    }
    if (ts.isReturnStatement(node) && node.expression) {
      const e = node.expression;
      if (isPredicateCall(e) || (ts.isIdentifier(e) && boundToDecision.has(e.text))) returns = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return returns;
}

/** Exported bindings whose value is, or returns, the predicate's decision. */
function decisionExportsOf(sf: ts.SourceFile): string[] {
  const exportedNames = new Set<string>();
  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt) && !stmt.moduleSpecifier && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) exportedNames.add((el.propertyName ?? el.name).text);
    }
    if (ts.isExportAssignment(stmt) && ts.isIdentifier(stmt.expression)) exportedNames.add(stmt.expression.text);
  }
  const found: string[] = [];
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      if ((hasExport(stmt) || exportedNames.has(stmt.name.text)) && returnsDecision(stmt)) found.push(stmt.name.text);
    }
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        const name = d.name.getText();
        if (!hasExport(stmt) && !exportedNames.has(name)) continue;
        const init = d.initializer;
        const isDecision =
          (d.type && DECISION_TYPE.test(d.type.getText())) ||
          isPredicateCall(init) ||
          (!!init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && returnsDecision(init));
        if (isDecision) found.push(name);
      }
    }
    if (ts.isExportAssignment(stmt)) {
      const e = stmt.expression;
      if (isPredicateCall(e) || ((ts.isArrowFunction(e) || ts.isFunctionExpression(e)) && returnsDecision(e))) {
        found.push('default');
      }
    }
  }
  return found;
}

/** The app files a source file imports, resolved from `@/` and relative specifiers. */
function importsOf(file: string): string[] {
  const source = stripped(file);
  const specs = [
    ...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/\b(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1]!);
  const out: string[] = [];
  for (const spec of specs) {
    let base: string | null = null;
    if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
    else if (spec.startsWith('.')) base = join(dirname(file), spec);
    if (!base) continue;
    const hit = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
    );
    if (hit) out.push(hit);
  }
  return out;
}

describe('one-hop rule: the predicate does not leak through an allowlisted module (FEAT-717 AC4)', () => {
  it('the detectors fire on every leak shape and stay quiet on a notice host (DEBUG-390)', () => {
    const leaks = parse(
      'leak.ts',
      `
        import { decideWellnessWrite, type WellnessWriteDecision } from '@/core/stores/consentStore';
        export { decideWellnessWrite };
        export { decideWellnessWrite as canWrite } from '@/core/stores/consentStore';
        export * from '@/core/stores/consentStore';
        export * as consent from '@/core/stores/consentStore';
        export const alias = decideWellnessWrite;
        export default decideWellnessWrite;
        export const snapshot = decideWellnessWrite();
        export const useDecision = () => decideWellnessWrite();
        export function viaLocal() { const d = decideWellnessWrite(); return d; }
        export function typed(): WellnessWriteDecision { return { allowed: true }; }
        function late() { return decideWellnessWrite(); }
        export { late };
      `,
    );
    expect(reExportsOf(leaks)).toEqual([
      'export { decideWellnessWrite }',
      'export { decideWellnessWrite as canWrite }',
      "export * from '@/core/stores/consentStore'",
      'export * as consent',
      'export const alias = decideWellnessWrite',
      'export default',
    ]);
    expect(decisionExportsOf(leaks).sort()).toEqual(['late', 'snapshot', 'typed', 'useDecision', 'viaLocal']);

    const host = parse(
      'host.tsx',
      `
        import { decideWellnessWrite } from '@/core/stores/consentStore';
        const Card = () => { const d = decideWellnessWrite(); return d.allowed ? null : <Text>x</Text>; };
        export const Leaf = () => { const [d] = useState(() => { return decideWellnessWrite(); }); return null; };
        export default Card;
      `,
    );
    expect(reExportsOf(host)).toEqual([]);
    expect(decisionExportsOf(host)).toEqual([]);
  });

  it('the decision detector finds consentStore\'s own export (positive control on real code)', () => {
    expect(decisionExportsOf(parse(CONSENT_STORE, readFileSync(CONSENT_STORE, 'utf8')))).toContain(PREDICATE_NAME);
  });

  it.each(PREDICATE_ALLOWLIST.filter((f) => f !== CONSENT_STORE).map((f) => [label(f), f]))(
    '%s neither re-exports the predicate nor exports a decision',
    (_label, file) => {
      const sf = parse(file, readFileSync(file, 'utf8'));
      expect(reExportsOf(sf)).toEqual([]);
      expect(decisionExportsOf(sf)).toEqual([]);
    },
  );

  it('no importer of an allowlisted module outside the allowlist reads the predicate', () => {
    const importers = ALL_FILES.filter((f) => !PREDICATE_ALLOWLIST.includes(f)).filter((f) =>
      importsOf(f).some((dep) => PREDICATE_ALLOWLIST.includes(dep)),
    );
    // Positive control: the resolver finds the real importers (consentStore alone has dozens).
    expect(importers.length).toBeGreaterThan(10);
    expect(importers).toContain(join(SRC, 'features/assessment/components/EnhancedAssessmentFlow.tsx'));
    expect(importers.filter((f) => PREDICATE.test(stripped(f))).map(label)).toEqual([]);
  });
});

describe('the legal-gate mirror has one owner', () => {
  // Hydration is fire-and-forget from loadConsent and must stay that way: if any
  // render path could await or subscribe to it, a hung Keychain read would hold
  // LoadingScreen with only Static988Button.
  const MIRROR_INTERNALS =
    /\b(?:hydrateLegalGateMirror|setLegalGateMirror|legalGateMirror|legalGateMirrorGeneration|legalGateMirrorWrittenThrough)\b/;

  it('the matcher fires on consentStore itself', () => {
    expect(stripped(CONSENT_STORE)).toMatch(MIRROR_INTERNALS);
  });

  it('no other file in app/src or App.tsx names them', () => {
    const files = [...sourceFiles(SRC), join(APP, 'App.tsx')];
    expect(files.length).toBeGreaterThan(100);
    const offenders = files
      .filter((f) => f !== CONSENT_STORE)
      .filter((f) => MIRROR_INTERNALS.test(stripped(f)))
      .map(label);
    expect(offenders).toEqual([]);
  });
});

describe('no crisis-path file reads the Art. 9 block start (FEAT-665)', () => {
  // Same rule as the predicate: FEAT-673 reads it in features/guidance, below the
  // screens listed here, never in them.
  const BLOCK_START = /\b(?:selectWellnessWriteBlockStart|getWellnessWriteBlockStart)\b/;

  it('the matcher fires on the stripped source of the module that defines it', () => {
    expect(stripped(CONSENT_STORE)).toMatch(BLOCK_START);
  });

  it.each(GUARDED_FILES.map((f) => [label(f), f]))('%s', (_label, file) => {
    expect(stripped(file)).not.toMatch(BLOCK_START);
  });
});

describe('FEAT-665 slice A2a-i ships unwired', () => {
  // Inert by AC1. FEAT-673 wires the block start and FEAT-685 the blocked log;
  // each deletes its own name from this list in the PR that wires it.
  const UNWIRED =
    /\b(?:selectWellnessWriteBlockStart|getWellnessWriteBlockStart|logWellnessWriteBlocked)\b/;

  it('the matcher fires on consentStore itself', () => {
    expect(stripped(CONSENT_STORE)).toMatch(UNWIRED);
  });

  it('no other file in app/src or App.tsx names them', () => {
    const files = [...sourceFiles(SRC), join(APP, 'App.tsx')];
    expect(files.length).toBeGreaterThan(100);
    const offenders = files
      .filter((f) => f !== CONSENT_STORE)
      .filter((f) => UNWIRED.test(stripped(f)))
      .map(label);
    expect(offenders).toEqual([]);
  });
});

describe('FEAT-717 slice A2a-ii ships unwired', () => {
  // Inert by AC7. FEAT-685 wires all four; it deletes each row in the PR that wires it.
  const LEDGER = join(SRC, 'features/assessment/stores/blockedPeriodLedger.ts');
  const EXPLAINER = join(SRC, 'features/assessment/components/AssessmentStorageExplainer.tsx');
  const NORMALISER = join(SRC, 'features/assessment/stores/persistedAssessmentBlob.ts');

  const UNWIRED: Array<[name: string, pattern: RegExp, home: string]> = [
    ['writeAssessmentErasure', /\bwriteAssessmentErasure\b/, ASSESSMENT_STORE],
    ['applyErasure', /\bapplyErasure\b/, ASSESSMENT_STORE],
    ['createBlockedPeriodLedger', /\bcreateBlockedPeriodLedger\b|['"/]blockedPeriodLedger['"]/, LEDGER],
    // The module path too: a default import can be bound under any name.
    ['AssessmentStorageExplainer', /\bAssessmentStorageExplainer\b|['"/]AssessmentStorageExplainer['"]/, EXPLAINER],
  ];

  it.each(UNWIRED)('the %s matcher fires on its own module', (_name, pattern, home) => {
    expect(stripped(home)).toMatch(pattern);
  });

  it('the module-path matchers fire on an import of the module', () => {
    expect("import X from '../components/AssessmentStorageExplainer';").toMatch(UNWIRED[3]![1]);
    expect("import { createBlockedPeriodLedger as c } from './blockedPeriodLedger';").toMatch(UNWIRED[2]![1]);
  });

  it.each(UNWIRED)('%s has no non-test referent outside its own module', (_name, pattern, home) => {
    expect(ALL_FILES.length).toBeGreaterThan(100);
    const offenders = ALL_FILES.filter((f) => f !== home)
      .filter((f) => pattern.test(stripped(f)))
      .map(label);
    expect(offenders).toEqual([]);
  });

  it('only assessmentStore and the ledger use the normaliser', () => {
    const users = ALL_FILES.filter((f) => importsOf(f).includes(NORMALISER)).map(label).sort();
    expect(users).toEqual([label(ASSESSMENT_STORE), label(LEDGER)].sort());
  });
});
