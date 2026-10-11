#!/usr/bin/env node
/**
 * Verify legal-docs registry consistency.
 *
 * The app exposes legal documents via three loosely-coupled surfaces:
 *   1. Canonical sources: `docs/legal/*.md` (minus internal-only docs)
 *   2. Codegen bridge: `SOURCES` in `app/scripts/generate-legal-content.js`
 *      — emits `legalContent.generated.ts` from the .md files
 *   3. Consumer: imports in `app/src/features/profile/content/legalDocuments.ts`
 *      from `./legalContent.generated`, plus the `LegalDocumentType` union
 *      and `legalDocuments` Record keys
 *
 * Drift between any pair is invisible at runtime in dev mode (Metro lazily
 * resolves what's imported) and only surfaces in Release-mode bundling or at
 * the screen that wants the missing content. This script catches drift at
 * CI time so it never reaches a build.
 *
 * (Prior version of this script — pre-DEBUG-178 — parsed cross-tree
 * `require('../../../../../docs/legal/*.md')` calls. That import shape was
 * removed when the loader switched to a generated TS module; the check now
 * walks the new three-surface wiring.)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LEGAL_DIR = path.join(REPO_ROOT, 'docs/legal');
const GENERATOR_PATH = path.join(REPO_ROOT, 'app/scripts/generate-legal-content.js');
const REGISTRY_PATH = path.join(
  REPO_ROOT,
  'app/src/features/profile/content/legalDocuments.ts',
);

// Markdown files in docs/legal/ that are NOT meant to be bundled into the
// app's legal-documents screen. Add a file here only when it is a meta /
// internal-reference doc (humans + agents read it, users don't see it).
const EXCLUDED_FROM_REGISTRY = new Set([
  'README', // Meta doc: how this directory is consumed and where changes land (INFRA-348).
  'regulatory-applicability', // Source-of-truth doc for compliance decisions.
  'dpia-sensitive-wellness-data', // Internal/regulator-facing DPIA; not user-facing (INFRA-153).
  'breach-notification-runbook', // Internal FTC HBNR operational runbook; founder + counsel only (INFRA-152).
  'lia-crisis-telemetry', // Internal vital-interests assessment for crisis-detection telemetry; regulator-facing only (INFRA-214 T5).
]);

function fail(msg) {
  console.error('\n❌ Legal registry drift detected:\n');
  console.error('  ' + msg.split('\n').join('\n  '));
  console.error('');
  process.exit(1);
}

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch (e) {
    fail(`could not read ${p}: ${e.message}`);
  }
}

/**
 * Reduce an object-literal body to its depth-0 text. Everything inside a nested
 * `{ … }` is dropped (the braces themselves are kept, so `key: {` still reads as a
 * key), and so are comments. Quoted strings are copied only at depth 0 — keys are
 * often quoted — and are scanned as units so a brace inside one never moves the depth.
 */
function topLevelOnly(body) {
  let out = '';
  let depth = 0;
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    const next = body[i + 1];
    if (c === '/' && next === '/') {
      while (i < body.length && body[i] !== '\n') i += 1;
    } else if (c === '/' && next === '*') {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 2;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < body.length && body[j] !== c) j += body[j] === '\\' ? 2 : 1;
      if (depth === 0) out += body.slice(i, j + 1);
      i = j + 1;
    } else {
      if (c === '{') {
        if (depth === 0) out += c;
        depth += 1;
      } else if (c === '}') {
        depth = Math.max(0, depth - 1);
        if (depth === 0) out += c;
      } else if (depth === 0 || c === '\n') {
        out += c;
      }
      i += 1;
    }
  }
  return out;
}

const arrEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Pure comparison of the three surfaces. Never calls fail() or process.exit.
 *
 * @param {string[]} mdFiles  RAW directory listing of docs/legal/ (filtering,
 *                            exclusion and sorting happen here).
 * @param {string} source     Text of app/scripts/generate-legal-content.js.
 * @param {string} registry   Text of legalDocuments.ts.
 * @returns {string[]} error messages; empty when consistent. A parse miss is an
 *                     entry, and suppresses the disagreement checks that depend
 *                     on the surface that could not be parsed.
 */
function compare(mdFiles, source, registry) {
  // 1. Markdown filenames on disk (without extension), minus intentional exclusions.
  const diskNames = mdFiles
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .filter((name) => !EXCLUDED_FROM_REGISTRY.has(name))
    .sort();

  const parseErrors = [];

  // 2. Parse SOURCES from the generator script.
  let sourceKeys = [];
  let sourceFiles = [];
  const sourcesMatch = source.match(/const SOURCES = \[([\s\S]*?)\];/);
  if (!sourcesMatch) {
    parseErrors.push(`could not locate \`const SOURCES = [ … ];\` in ${GENERATOR_PATH}`);
  } else {
    const sourceEntries = [
      ...sourcesMatch[1].matchAll(
        /\{\s*key:\s*'([A-Za-z0-9_]+)'\s*,\s*file:\s*'([^']+\.md)'\s*\}/g,
      ),
    ];
    if (sourceEntries.length === 0) {
      parseErrors.push(`SOURCES block found but no { key, file } entries parsed in ${GENERATOR_PATH}`);
    } else {
      sourceKeys = sourceEntries.map((m) => m[1]).sort();
      sourceFiles = sourceEntries.map((m) => m[2].replace(/\.md$/, '')).sort();
    }
  }

  // 3. Parse legalDocuments.ts.
  // 3a. Imports from ./legalContent.generated.
  let importNames = [];
  const importMatch = registry.match(
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]\.\/legalContent\.generated['"]/,
  );
  if (!importMatch) {
    parseErrors.push(
      `could not locate \`import { … } from './legalContent.generated'\` in registry`,
    );
  } else {
    importNames = [...importMatch[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)/g)]
      .map((m) => m[1])
      .sort();
  }

  // 3b. LegalDocumentType union members.
  let unionMembers = [];
  const unionMatch = registry.match(
    /export type LegalDocumentType =([\s\S]*?);/,
  );
  if (!unionMatch) {
    parseErrors.push('could not locate `export type LegalDocumentType = …;` in registry');
  } else {
    unionMembers = [...unionMatch[1].matchAll(/'([^']+)'/g)]
      .map((m) => m[1])
      .sort();
  }

  // 3c. legalDocuments Record keys.
  let recordKeys = [];
  const recordMatch = registry.match(
    /export const legalDocuments[^{]*\{([\s\S]*?)^\};/m,
  );
  if (!recordMatch) {
    parseErrors.push('could not locate `export const legalDocuments … = { … };` in registry');
  } else {
    recordKeys = [
      ...topLevelOnly(recordMatch[1]).matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*\{/gm),
    ]
      .map((m) => m[1])
      .sort();
  }

  if (parseErrors.length > 0) return parseErrors;

  // 4. Compare.
  const errors = [];
  if (!arrEqual(diskNames, sourceFiles)) {
    errors.push(
      `docs/legal/*.md filenames vs generator SOURCES.file disagree:\n` +
        `  on disk:   ${JSON.stringify(diskNames)}\n` +
        `  generator: ${JSON.stringify(sourceFiles)}`,
    );
  }
  if (!arrEqual(sourceKeys, importNames)) {
    errors.push(
      `generator SOURCES.key vs legalDocuments.ts imports disagree:\n` +
        `  generator: ${JSON.stringify(sourceKeys)}\n` +
        `  imports:   ${JSON.stringify(importNames)}`,
    );
  }
  if (!arrEqual(unionMembers, recordKeys)) {
    errors.push(
      `LegalDocumentType union vs legalDocuments Record keys disagree:\n` +
        `  union:    ${JSON.stringify(unionMembers)}\n` +
        `  record:   ${JSON.stringify(recordKeys)}`,
    );
  }
  if (!arrEqual(diskNames, unionMembers)) {
    errors.push(
      `docs/legal/*.md filenames vs LegalDocumentType union disagree:\n` +
        `  on disk:  ${JSON.stringify(diskNames)}\n` +
        `  union:    ${JSON.stringify(unionMembers)}`,
    );
  }
  return errors;
}

function main() {
  const mdFiles = fs.readdirSync(LEGAL_DIR);
  const generatorSrc = readFile(GENERATOR_PATH);
  const registrySrc = readFile(REGISTRY_PATH);

  const errors = compare(mdFiles, generatorSrc, registrySrc);
  if (errors.length > 0) {
    fail(errors.join('\n\n'));
  }

  const names = mdFiles
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .filter((name) => !EXCLUDED_FROM_REGISTRY.has(name))
    .sort();
  console.log(
    `✅ Legal registry consistent (${names.length} docs: ${names.join(', ')})`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { compare, EXCLUDED_FROM_REGISTRY };
