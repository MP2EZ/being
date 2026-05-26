#!/usr/bin/env node
/**
 * Verify service-singleton `setInterval` calls are guarded under
 * `NODE_ENV === 'test'`.
 *
 * The bug class:
 *   Singleton services whose init methods call `setInterval` without a
 *   test-env guard keep the Jest event loop alive after tests teardown.
 *   This manifests as "Cannot log after tests are done" warnings on the
 *   interval cadence and ultimately a 15-min CI timeout when GH kills
 *   the orphan process.
 *
 * Precedent fixes:
 *   - INFRA-144: EncryptionService, SecureStorageService
 *     (guard at constructor, init method skipped entirely)
 *   - INFRA-175: CrisisSecurityProtocol, IncidentResponseService,
 *     SecurityMonitoringService, NetworkSecurityService,
 *     AuthenticationService
 *     (guard at top of init method, returns early)
 *
 * Both patterns are valid; the script detects either:
 *   1. INFRA-175 style: a `process.env.NODE_ENV === 'test'` check appears
 *      within 40 lines above the `setInterval` line in the same file.
 *   2. INFRA-144 style: the enclosing method is called elsewhere in the
 *      file, with a guard preceding the call site.
 *
 * Escape hatch:
 *   Place `// interval-guard-skip: <reason>` on the line immediately
 *   above an intentional unguarded `setInterval`. Rare; expect 0-2
 *   usages in the entire codebase.
 *
 * Out of scope:
 *   - React hooks under `hooks/` directories. Hooks have lifecycle
 *     cleanup via useEffect's return function; bug class doesn't apply.
 *   - Test files (`__tests__/`, `*.test.ts`, `*.spec.ts`).
 *   - Components (only `app/src/core/services/**` and
 *     `app/src/features/&#42;&#42;/services/**` are scanned).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVICE_ROOTS = [
  path.join(REPO_ROOT, 'app/src/core/services'),
  path.join(REPO_ROOT, 'app/src/features'),
];
// Within app/src/features/**, only files under a `services/` subdir count.
const FEATURE_SERVICE_FILTER = /\/services\//;

const BACKWARD_SCOPE_LINES = 40;
const SET_INTERVAL_RE = /(^|[^.\w])setInterval\s*\(/;
// Match either guard semantic:
//   INFRA-175 in-method:   `if (process.env.NODE_ENV === 'test') return;`
//   INFRA-144 at-caller:   `if (process.env.NODE_ENV !== 'test') { runTimer }`
// Both express "don't run timer under test", just from different sides.
const GUARD_RE = /process\.env\.NODE_ENV\s*(?:===|!==)\s*['"]test['"]/;
const SKIP_DIRECTIVE_RE = /\/\/\s*interval-guard-skip\b/;
// Detect enclosing method declaration walking backwards. Matches:
//   private foo(...)
//   public async foo(...)
//   private foo<T>(...)
//   foo(...)  (bare class method without modifier)
const METHOD_DECL_RE =
  /^\s*(?:(?:private|public|protected)\s+)?(?:async\s+)?([a-zA-Z_$][\w$]*)\s*(?:<[^>]+>)?\s*\(/;

function isTestFile(filePath) {
  return (
    filePath.includes('/__tests__/') ||
    /\.(test|spec)\.tsx?$/.test(filePath)
  );
}

function isHookFile(filePath) {
  // Hooks live under */hooks/* directories OR follow the use*.ts convention.
  return (
    /\/hooks\//.test(filePath) ||
    /\/use[A-Z][\w]*\.tsx?$/.test(filePath)
  );
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*')
  );
}

function walkDir(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, out);
    } else if (entry.isFile() && full.endsWith('.ts') && !isTestFile(full) && !isHookFile(full)) {
      // For features/, only collect files under a services/ subdir.
      if (full.startsWith(SERVICE_ROOTS[1]) && !FEATURE_SERVICE_FILTER.test(full)) {
        continue;
      }
      out.push(full);
    }
  }
  return out;
}

/**
 * Find the enclosing method/function name for a given line index by
 * walking backwards until we hit a method declaration. Returns null if
 * no declaration is found within reasonable scope.
 */
function findEnclosingMethod(lines, lineIdx) {
  let braceDepth = 0;
  for (let i = lineIdx - 1; i >= 0; i--) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    // Count braces in this line (rough — doesn't handle strings perfectly,
    // but good enough for the file-shape we're dealing with).
    for (const ch of line) {
      if (ch === '}') braceDepth++;
      else if (ch === '{') braceDepth--;
    }
    // When braceDepth goes negative, we've exited the enclosing block
    // upward — the method declaration is on or before this line.
    if (braceDepth < 0) {
      const m = METHOD_DECL_RE.exec(line);
      if (m) return m[1];
      // Block boundary but no method — keep walking (could be a try/catch).
      braceDepth = 0;
    }
  }
  return null;
}

/**
 * Check if a given method name is called elsewhere in the same file with
 * a guard preceding the call site within 5 lines.
 */
function isCalledFromGuardedSite(lines, methodName, originLineIdx) {
  // Match `this.methodName(` or bare `methodName(` calls.
  const callRe = new RegExp(`\\b(?:this\\.)?${methodName}\\s*\\(`);
  for (let i = 0; i < lines.length; i++) {
    if (i === originLineIdx) continue; // skip the declaration site itself
    const line = lines[i];
    if (isCommentLine(line)) continue;
    if (!callRe.test(line)) continue;
    // Found a call site — check for guard in preceding 5 lines.
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      if (GUARD_RE.test(lines[j])) return true;
    }
  }
  return false;
}

function fail(msg) {
  console.error('\n❌ Service-singleton setInterval leak guard check failed:\n');
  console.error(msg);
  console.error(
    '\nFix patterns (see INFRA-144 / INFRA-175 precedents):\n\n' +
      '  Pattern A (INFRA-175, guard inside the method):\n' +
      '    if (process.env.NODE_ENV === \'test\') return;\n' +
      '    // …existing setInterval(…) call…\n\n' +
      '  Pattern B (INFRA-144, guard at the caller):\n' +
      '    constructor() {\n' +
      '      if (process.env.NODE_ENV !== \'test\') {\n' +
      '        this.initializeFoo();\n' +
      '      }\n' +
      '    }\n\n' +
      'If this is an intentional unguarded call, add\n' +
      '`// interval-guard-skip: <reason>` directly above the setInterval line.\n'
  );
  process.exit(1);
}

const files = [];
for (const root of SERVICE_ROOTS) {
  walkDir(root, files);
}
files.sort();

const unguarded = [];
let guardedInMethod = 0;
let guardedAtCaller = 0;
let skippedCount = 0;

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    if (!SET_INTERVAL_RE.test(line)) continue;

    // Escape hatch on the line directly above.
    const prev = i > 0 ? lines[i - 1] : '';
    if (SKIP_DIRECTIVE_RE.test(prev)) {
      skippedCount++;
      continue;
    }

    // Pattern A: guard within BACKWARD_SCOPE_LINES above in same file.
    const start = Math.max(0, i - BACKWARD_SCOPE_LINES);
    let guarded = false;
    for (let j = i - 1; j >= start; j--) {
      if (GUARD_RE.test(lines[j])) {
        guarded = true;
        guardedInMethod++;
        break;
      }
    }
    if (guarded) continue;

    // Pattern B: guard at caller of the enclosing method.
    const methodName = findEnclosingMethod(lines, i);
    if (methodName && isCalledFromGuardedSite(lines, methodName, i)) {
      guardedAtCaller++;
      continue;
    }

    const rel = path.relative(REPO_ROOT, file);
    unguarded.push(`  ${rel}:${i + 1}\n    ${line.trim()}`);
  }
}

if (unguarded.length > 0) {
  fail(
    `Found ${unguarded.length} unguarded setInterval call(s) in service files.\n` +
      `(${guardedInMethod} guarded in-method, ${guardedAtCaller} guarded at caller, ` +
      `${skippedCount} explicitly skipped.)\n\n` +
      'Unguarded calls:\n' +
      unguarded.join('\n')
  );
}

const guardedTotal = guardedInMethod + guardedAtCaller;
const breakdown =
  guardedTotal > 0
    ? ` (${guardedInMethod} in-method, ${guardedAtCaller} at caller)`
    : '';
const skippedNote = skippedCount > 0 ? `, ${skippedCount} explicitly skipped` : '';
console.log(
  `✅ All ${guardedTotal} service setInterval call(s) properly guarded under NODE_ENV=test${breakdown}${skippedNote}.`
);
