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
  'regulatory-applicability', // Source-of-truth doc for compliance decisions.
  'dpia-sensitive-wellness-data', // Internal/regulator-facing DPIA; not user-facing (INFRA-153).
  'breach-notification-runbook', // Internal FTC HBNR operational runbook; founder + counsel only (INFRA-152).
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

// 1. Markdown filenames on disk (without extension), minus intentional exclusions.
const mdFiles = fs
  .readdirSync(LEGAL_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .filter((name) => !EXCLUDED_FROM_REGISTRY.has(name))
  .sort();

// 2. Parse SOURCES from the generator script.
const generatorSrc = readFile(GENERATOR_PATH);
const sourcesMatch = generatorSrc.match(/const SOURCES = \[([\s\S]*?)\];/);
if (!sourcesMatch) {
  fail(`could not locate \`const SOURCES = [ … ];\` in ${GENERATOR_PATH}`);
}
const sourceEntries = [
  ...sourcesMatch[1].matchAll(
    /\{\s*key:\s*'([A-Za-z0-9_]+)'\s*,\s*file:\s*'([^']+\.md)'\s*\}/g,
  ),
];
if (sourceEntries.length === 0) {
  fail(`SOURCES block found but no { key, file } entries parsed in ${GENERATOR_PATH}`);
}
const sourceKeys = sourceEntries.map((m) => m[1]).sort();
const sourceFiles = sourceEntries.map((m) => m[2].replace(/\.md$/, '')).sort();

// 3. Parse legalDocuments.ts.
const registrySrc = readFile(REGISTRY_PATH);

// 3a. Imports from ./legalContent.generated.
const importMatch = registrySrc.match(
  /import\s*\{([\s\S]*?)\}\s*from\s*['"]\.\/legalContent\.generated['"]/,
);
if (!importMatch) {
  fail(
    `could not locate \`import { … } from './legalContent.generated'\` in registry`,
  );
}
const importNames = [...importMatch[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)/g)]
  .map((m) => m[1])
  .sort();

// 3b. LegalDocumentType union members.
const unionMatch = registrySrc.match(
  /export type LegalDocumentType =([\s\S]*?);/,
);
if (!unionMatch) {
  fail('could not locate `export type LegalDocumentType = …;` in registry');
}
const unionMembers = [...unionMatch[1].matchAll(/'([^']+)'/g)]
  .map((m) => m[1])
  .sort();

// 3c. legalDocuments Record keys.
const recordMatch = registrySrc.match(
  /export const legalDocuments[^{]*\{([\s\S]*?)^\};/m,
);
if (!recordMatch) {
  fail('could not locate `export const legalDocuments … = { … };` in registry');
}
const recordKeys = [
  ...recordMatch[1].matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*\{/gm),
]
  .map((m) => m[1])
  .sort();

// 4. Compare.
const arrEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const errors = [];
if (!arrEqual(mdFiles, sourceFiles)) {
  errors.push(
    `docs/legal/*.md filenames vs generator SOURCES.file disagree:\n` +
      `  on disk:   ${JSON.stringify(mdFiles)}\n` +
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
if (!arrEqual(mdFiles, unionMembers)) {
  errors.push(
    `docs/legal/*.md filenames vs LegalDocumentType union disagree:\n` +
      `  on disk:  ${JSON.stringify(mdFiles)}\n` +
      `  union:    ${JSON.stringify(unionMembers)}`,
  );
}

if (errors.length > 0) {
  fail(errors.join('\n\n'));
}

console.log(
  `✅ Legal registry consistent (${mdFiles.length} docs: ${mdFiles.join(', ')})`,
);
