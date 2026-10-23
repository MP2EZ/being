/**
 * User-facing terminology pin (MAINT-845).
 *
 * Being is a wellness practice, not therapy (ToS §2/§3, medical-disclaimer.md), and the
 * privacy policy's in-app term is "wellness data". So no literal in app/src may say
 * "therapeutic" or "health data" (which also catches "mental-health data", the policy's
 * sensitive-category term, kept out of in-app copy by compliance ruling 2026-10-22).
 *
 * METHOD. Every non-test .ts/.tsx under app/src is parsed with the TypeScript compiler, and
 * every string-bearing node is checked: StringLiteral (which includes JSX attribute values
 * and literal types), NoSubstitutionTemplateLiteral, TemplateHead/Middle/Tail and JsxText.
 * Comments, identifiers and RegularExpressionLiteral are NOT scanned: errorSanitization.ts's
 * /therapeuticValue/gi is a redaction pattern, and identifiers never reach a user.
 *
 * ALLOWLIST. Keyed on (file, exact literal text), never a line number, each with a reason
 * and an expected count. A stale row fails, so the list cannot outlive its literal. A new
 * internal literal fails by design: add a row with a reason, or reword it.
 *
 * legalContent.generated.ts is excluded by exact path: docs/legal owns that text.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import * as ts from 'typescript';

const APP = join(__dirname, '../..');
const SRC = join(APP, 'src');
const LEGAL_GENERATED = 'src/features/profile/content/legalContent.generated.ts';

const BANNED: readonly RegExp[] = [/therapeutic/i, /\bhealth[\s-]+data\b/i];

// Labelled by hand: ts.SyntaxKind[kind] prints an alias for some kinds
// (TemplateHead comes out as FirstTemplateToken in ts 6.0.3).
const KIND_LABEL = new Map<ts.SyntaxKind, string>([
  [ts.SyntaxKind.StringLiteral, 'StringLiteral'],
  [ts.SyntaxKind.NoSubstitutionTemplateLiteral, 'NoSubstitutionTemplateLiteral'],
  [ts.SyntaxKind.TemplateHead, 'TemplateHead'],
  [ts.SyntaxKind.TemplateMiddle, 'TemplateMiddle'],
  [ts.SyntaxKind.TemplateTail, 'TemplateTail'],
  [ts.SyntaxKind.JsxText, 'JsxText'],
]);

type Hit = { kind: string; text: string };

/** Every banned literal in one source file. Pure: no disk access. */
function scanSource(relPath: string, source: string): Hit[] {
  const sourceFile = ts.createSourceFile(
    relPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hits: Hit[] = [];
  const visit = (node: ts.Node): void => {
    const kind = KIND_LABEL.get(node.kind);
    if (kind) {
      // JsxText carries layout whitespace; every other kind is matched exactly.
      const text = ts.isJsxText(node) ? node.text.trim() : (node as ts.LiteralLikeNode).text;
      if (BANNED.some((re) => re.test(text))) hits.push({ kind, text });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
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

type AllowRow = { file: string; text: string; count: number; reason: string };

const ALLOWLIST: readonly AllowRow[] = [
  {
    file: 'src/core/config/env.ts',
    text: 'EXPO_PUBLIC_THERAPEUTIC_TIMING_STRICT',
    count: 1,
    reason: 'env var name, never rendered; dead (no reader) but not renamed here',
  },
  {
    file: 'src/core/services/logging/SensitiveDataPatterns.ts',
    text: 'therapeutic',
    count: 1,
    reason: 'redaction keyword; the list must stay byte-identical',
  },
  {
    file: 'src/core/services/logging/ExternalErrorReporter.ts',
    text: 'therapeutic',
    count: 1,
    reason: 'redaction keyword; the list must stay byte-identical',
  },
  {
    file: 'src/core/services/monitoring/CrisisMonitoringService.ts',
    text: 'Therapeutic effectiveness below threshold: ',
    count: 1,
    reason: 'internal monitoring alert TemplateHead, never shown to a user',
  },
  {
    file: 'src/features/assessment/components/AssessmentResults.tsx',
    text: 'therapeutic-guidance',
    count: 1,
    reason: 'element id; FocusManager would speak it, but nothing calls its focus methods',
  },
];

const FILES = sourceFiles(SRC).filter((f) => relative(APP, f) !== LEGAL_GENERATED);

const CENSUS: Array<Hit & { file: string }> = FILES.flatMap((f) =>
  scanSource(relative(APP, f), readFileSync(f, 'utf8')).map((h) => ({ ...h, file: relative(APP, f) })),
);

const countOf = (file: string, text: string): number =>
  CENSUS.filter((h) => h.file === file && h.text === text).length;

describe('the scanner', () => {
  it.each([
    ['plain string', `const a = 'A therapeutic exercise';`, 'StringLiteral'],
    ['JSX attribute', `const a = <View accessibilityHint="therapeutic hint" />;`, 'StringLiteral'],
    ['literal type', `type T = 'therapeutic';`, 'StringLiteral'],
    ['no-substitution template', 'const a = `Your health data`;', 'NoSubstitutionTemplateLiteral'],
    ['template head', 'const a = `Therapeutic ${x} tail`;', 'TemplateHead'],
    ['template middle', 'const a = `a ${x} therapeutic ${y} b`;', 'TemplateMiddle'],
    ['template tail', 'const a = `a ${x} health-data`;', 'TemplateTail'],
    ['JsxText', `const a = <Text>Your therapeutic values</Text>;`, 'JsxText'],
    ['mental-health data JsxText', `const a = <Text>Your mental-health data stays here</Text>;`, 'JsxText'],
  ])('flags a planted %s', (_label, source, kind) => {
    const hits = scanSource('fixture.tsx', source);
    expect(hits).toHaveLength(1);
    expect(hits[0].kind).toBe(kind);
  });

  it.each([
    ['regex literal', 'const re = /therapeuticValue/gi;'],
    ['line comment', '// therapeutic health data\nconst a = 1;'],
    ['block comment', '/* therapeutic */ const a = 1;'],
    ['identifier', 'const therapeuticValues = healthData;'],
    ['adjacent wording', `const a = <Text>Mental health information</Text>;`],
  ])('does not flag a %s', (_label, source) => {
    expect(scanSource('fixture.tsx', source)).toEqual([]);
  });

  it('walks the real tree (liveness floor)', () => {
    expect(FILES.length).toBeGreaterThan(250);
    expect(existsSync(join(APP, LEGAL_GENERATED))).toBe(true);
  });
});

describe('app/src literals', () => {
  it('contain no "therapeutic" or "health data" outside the allowlist', () => {
    const unlisted = CENSUS.filter(
      (h) => !ALLOWLIST.some((row) => row.file === h.file && row.text === h.text),
    ).map((h) => `${h.file} [${h.kind}] ${JSON.stringify(h.text)}`);
    expect(unlisted).toEqual([]);
  });

  it.each(ALLOWLIST.map((row) => [row.file, row.text, row] as const))(
    'allowlist row %s %j is still backed at its expected count',
    (file, text, row) => {
      expect(countOf(file, text)).toBe(row.count);
    },
  );
});
