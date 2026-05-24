#!/usr/bin/env node
/**
 * Verify legal-docs registry consistency.
 *
 * The app at `app/src/features/profile/content/legalDocuments.ts` statically
 * `require()`s every file in `docs/legal/*.md` via Metro's markdown
 * transformer. When the two drift, Metro bundle fails — and being CI does
 * not run a Metro bundle gate, so the drift is invisible until the next
 * app build.
 *
 * This script catches the drift at CI time by comparing three sources:
 *   1. The filenames in docs/legal/*.md
 *   2. The require() calls in legalDocuments.ts
 *   3. The LegalDocumentType union members AND the legalDocuments Record keys
 *
 * Any mismatch exits non-zero with a clear diff.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LEGAL_DIR = path.join(REPO_ROOT, 'docs/legal');
const REGISTRY_PATH = path.join(
  REPO_ROOT,
  'app/src/features/profile/content/legalDocuments.ts',
);

// Markdown files in docs/legal/ that are NOT meant to be bundled into the
// app's legal-documents screen. Add a file here only when it is a meta /
// internal-reference doc (humans + agents read it, users don't see it).
const EXCLUDED_FROM_REGISTRY = new Set([
  'regulatory-applicability', // Source-of-truth doc for compliance decisions.
]);

function fail(msg) {
  console.error('\n❌ Legal registry drift detected:\n');
  console.error('  ' + msg.split('\n').join('\n  '));
  console.error('');
  process.exit(1);
}

// 1. Markdown filenames on disk (without extension), minus intentional exclusions.
const mdFiles = fs
  .readdirSync(LEGAL_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .filter((name) => !EXCLUDED_FROM_REGISTRY.has(name))
  .sort();

// 2. Parse legalDocuments.ts.
let registrySrc;
try {
  registrySrc = fs.readFileSync(REGISTRY_PATH, 'utf-8');
} catch (e) {
  fail(`could not read registry at ${REGISTRY_PATH}: ${e.message}`);
}

// 2a. require('../../../../../docs/legal/<name>.md')
const requiredFiles = [
  ...registrySrc.matchAll(
    /require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/docs\/legal\/([^'"\\]+)\.md['"]\)/g,
  ),
]
  .map((m) => m[1])
  .sort();

// 2b. LegalDocumentType union members.
const unionMatch = registrySrc.match(
  /export type LegalDocumentType =([\s\S]*?);/,
);
if (!unionMatch) {
  fail('could not locate `export type LegalDocumentType = …;` in registry');
}
const unionMembers = [...unionMatch[1].matchAll(/'([^']+)'/g)]
  .map((m) => m[1])
  .sort();

// 2c. legalDocuments Record keys.
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

// 3. Compare.
const arrEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const errors = [];
if (!arrEqual(mdFiles, requiredFiles)) {
  errors.push(
    `docs/legal/*.md filenames vs require() calls disagree:\n` +
      `  on disk:   ${JSON.stringify(mdFiles)}\n` +
      `  required:  ${JSON.stringify(requiredFiles)}`,
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
