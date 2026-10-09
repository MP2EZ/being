/**
 * Console capture for the log-leak tests (MAINT-765).
 *
 * Not a test file (no `.test.` in the name). Every console level is patched, and every
 * non-string argument is rendered with an UNLIMITED-depth Deno.inspect - the way a log sink
 * records an object - so an Error's message and stack, a whole PostgrestError, and a value
 * nested five levels down are all visible to a forbidden-string assertion. Deno's default
 * depth of 4 would print `[Object]` for the deep one and let the leak pass.
 */

const LEVELS = ['log', 'info', 'warn', 'error', 'debug'] as const;

const INSPECT_OPTIONS = {
  depth: Infinity,
  iterableLimit: Infinity,
  strAbbreviateSize: Infinity,
} as const;

/** One log call rendered as one line: strings verbatim, everything else fully inspected. */
export function renderConsoleArgs(args: unknown[]): string {
  return args.map((a) => (typeof a === 'string' ? a : Deno.inspect(a, INSPECT_OPTIONS))).join(' ');
}

/**
 * Run `fn` with the console captured; always restore it. Pass `sink` to append into a caller's
 * array as lines arrive, so they survive `fn` throwing.
 */
export async function captureConsole<T>(
  fn: () => Promise<T> | T,
  sink: string[] = [],
): Promise<{ result: T; lines: string[] }> {
  const saved = LEVELS.map((level) => console[level]);
  const lines = sink;
  for (const level of LEVELS) {
    console[level] = (...args: unknown[]) => {
      lines.push(renderConsoleArgs(args));
    };
  }
  try {
    return { result: await fn(), lines };
  } finally {
    LEVELS.forEach((level, i) => (console[level] = saved[i]));
  }
}
