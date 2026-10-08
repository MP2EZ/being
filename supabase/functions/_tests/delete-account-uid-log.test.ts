/**
 * delete-account never logs the erased user's id (DEBUG-761) - source pin.
 *
 * delete-account erases the caller's account. A log line carrying the uid outlives that
 * erasure in Supabase's function logs, which contradicts the privacy policy's deletion record
 * ("no identifier of any kind"). The compliance ruling is to drop the identifier outright: no
 * hash, HMAC or truncation, because any uid-derived marker can be re-linked through the clear
 * uid other functions log for live users.
 *
 * This pins every console call in every file of the function, in ANY argument position, so a
 * second argument (`console.log('x', authUid)`) fires as surely as a template literal. Comments
 * are stripped first (DEBUG-390): this codebase names the anti-pattern in prose. The behavioural
 * companion in delete-account-handler.test.ts captures what actually reaches the console,
 * which also catches aliasing this source match cannot see.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';

const FUNCTION_DIR = new URL('../delete-account/', import.meta.url);

/** Identity names a log call must never reference. The binding read from
 *  getAuthUidFromRequest is added at run time, so a rename cannot disarm the pin. */
const BASE_TAINT = ['authUid', 'uid', 'userId', 'user_id', 'sub'];

const CONSOLE_CALL = /\bconsole\s*\.\s*(?:log|info|warn|error|debug|trace)\s*\(/g;

/**
 * Replace comments with spaces, keeping string and template literals intact (so a `//` inside
 * a URL string survives, and a quoted `(` is still text).
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (c === "'" || c === '"' || c === '`') {
      const end = skipString(src, i);
      out += src.slice(i, end);
      i = end;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Index just past the string literal opening at `start`. */
function skipString(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2;
      continue;
    }
    if (src[i] === quote) return i + 1;
    i++;
  }
  return src.length;
}

/** Argument text of every console call, sliced from its `(` to the matching `)`. */
function consoleCallArgs(code: string): string[] {
  const slices: string[] = [];
  for (const m of code.matchAll(CONSOLE_CALL)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    let depth = 0;
    let i = open;
    while (i < code.length) {
      const c = code[i];
      if (c === "'" || c === '"' || c === '`') {
        i = skipString(code, i);
        continue;
      }
      if (c === '(') depth++;
      if (c === ')') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    slices.push(code.slice(open + 1, i));
  }
  return slices;
}

function taintNames(code: string): string[] {
  const names = new Set(BASE_TAINT);
  for (const m of code.matchAll(/(\w+)\s*=\s*getAuthUidFromRequest\s*\(/g)) names.add(m[1]);
  return [...names];
}

/** Console-call slices in `src` that reference any taint name. */
function taintedCalls(src: string, names: string[]): string[] {
  return consoleCallArgs(stripComments(src)).filter((args) =>
    args.includes('getAuthUidFromRequest') ||
    names.some((n) => new RegExp(`\\b${n}\\b`).test(args))
  );
}

function functionSources(): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of Deno.readDirSync(FUNCTION_DIR)) {
    if (entry.isFile && entry.name.endsWith('.ts')) {
      files.set(entry.name, Deno.readTextFileSync(new URL(entry.name, FUNCTION_DIR)));
    }
  }
  return files;
}

Deno.test('no console call in delete-account references the user id', () => {
  const files = functionSources();
  assert(files.has('handler.ts'), 'handler.ts not found - the pin would read nothing');
  assert(files.has('index.ts'), 'index.ts not found - the pin would read nothing');

  const handlerCode = stripComments(files.get('handler.ts')!);
  // Non-vacuity: the identity binding is found, the slicer sees calls, and the uid is still
  // in use - so a rename or a moved delete fails here instead of quietly passing.
  assert(
    /\bauthUid\s*=\s*getAuthUidFromRequest\s*\(/.test(handlerCode),
    'identity binding from getAuthUidFromRequest not found',
  );
  assert(/deleteUser\s*\(\s*authUid\b/.test(handlerCode), 'deleteUser(authUid ...) not found');
  assert(consoleCallArgs(handlerCode).length >= 1, 'no console call sliced from handler.ts');

  for (const [name, src] of files) {
    const hits = taintedCalls(src, taintNames(stripComments(src)));
    assertEquals(hits, [], `${name}: a console call references the user id`);
  }
});

// The pipeline must fire on the shapes that leak and stay silent on the ones that do not.
const NAMES = taintNames('');

for (
  const [label, src] of [
    ['separate argument', "console.log('x', authUid);"],
    ['template literal', 'console.log(`x ${authUid}`);'],
    ['multi-line object', "console.error(\n  'x',\n  { user: authUid },\n);"],
    ['quoted paren before the arg', "console.log('(', authUid);"],
    ['the pre-fix line', "console.log('[delete-account] erased account + cascade for user:', authUid);"],
    ['derived binding', "const who = getAuthUidFromRequest(req);\nconsole.warn('x', who);"],
  ] as const
) {
  Deno.test(`control fires: ${label}`, () => {
    const names = taintNames(stripComments(src));
    assertEquals(taintedCalls(src, names).length, 1, label);
  });
}

for (
  const [label, src] of [
    ['line comment', "// console.log('x', authUid);"],
    ['block comment', "/* console.log('x', authUid) */"],
    ['JSDoc', "/**\n * Never console.log(authUid) here.\n */\nconsole.log('done');"],
    ['fixed message', "console.log('[delete-account] erased account + cascade');"],
    ['uid outside the call', "console.log('x');\nawait deleteUser(authUid, false);"],
    ['URL string with //', "console.log('see https://example.test/a');"],
  ] as const
) {
  Deno.test(`control stays silent: ${label}`, () => {
    assertEquals(taintedCalls(src, NAMES), [], label);
  });
}
