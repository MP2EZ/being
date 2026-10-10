/**
 * Meta-test for scripts/check-service-interval-guards.js (MAINT-742 / TEST-18).
 *
 * Driven by inline fixture strings through the pure `scanSource`, so it pins
 * BEHAVIOUR and does not break when a real service legitimately changes. The last
 * block runs the real tree through the CLI, deliberately: the point of the guard
 * is that the real tree stays clean.
 */

const path = require('path');
const { spawnSync } = require('child_process');
const {
  findEnclosingMethod,
  isCalledFromGuardedSite,
  isTestFile,
  isHookFile,
  scanSource,
} = require('../../../scripts/check-service-interval-guards');

const SCRIPT = path.resolve(__dirname, '..', '..', '..', 'scripts', 'check-service-interval-guards.js');

const src = (...lines) => lines.join('\n');
// Pushes the caller guard beyond the 40-line backward window so the brace-walking
// (Pattern B) path is the only way a fixture can pass.
const FILLER = Array.from({ length: 45 }, (_, i) => `  // filler ${i}`);
const summary = (r) => ({
  inMethod: r.guardedInMethod,
  atCaller: r.guardedAtCaller,
  skipped: r.skipped,
  unguarded: r.unguarded.length,
});

describe('scanSource: accepted shapes', () => {
  it('Pattern A: guard inside the method that calls setInterval', () => {
    const r = scanSource(
      src(
        'class S {',
        '  private startTimer() {',
        "    if (process.env.NODE_ENV === 'test') return;",
        '    setInterval(() => this.tick(), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 1, atCaller: 0, skipped: 0, unguarded: 0 });
  });

  it('Pattern B: the only caller of the enclosing method is guarded', () => {
    const r = scanSource(
      src(
        'class S {',
        '  constructor() {',
        "    if (process.env.NODE_ENV !== 'test') {",
        '      this.startTimer();',
        '    }',
        '  }',
        '  private startTimer() {',
        '    setInterval(() => this.tick(), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 1, skipped: 0, unguarded: 0 });
  });

  it('honours the interval-guard-skip directive on the preceding line', () => {
    const r = scanSource(
      src(
        'class S {',
        '  private startTimer() {',
        '    // interval-guard-skip: process-lifetime heartbeat, cleared in stop()',
        '    setInterval(() => this.tick(), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 0, skipped: 1, unguarded: 0 });
  });

  it('ignores setInterval mentioned in a comment line and member calls like timers.setInterval', () => {
    const r = scanSource(
      src(
        'class S {',
        '  private a() {',
        '    // setInterval(() => x(), 1)',
        '    this.timers.setInterval(() => x(), 1);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 0, skipped: 0, unguarded: 0 });
  });
});

describe('scanSource: rejected shapes', () => {
  it('flags an unguarded setInterval with its 1-indexed line', () => {
    const r = scanSource(
      src(
        'class S {',
        '  private startTimer() {',
        '    setInterval(() => this.tick(), 1000);',
        '  }',
        '}'
      )
    );
    expect(r.unguarded).toEqual([{ line: 3, text: 'setInterval(() => this.tick(), 1000);' }]);
  });

  it('flags a caller guard that sits more than 5 lines above the call site', () => {
    const r = scanSource(
      src(
        'class S {',
        '  constructor() {',
        "    if (process.env.NODE_ENV !== 'test') {",
        '      // 1',
        '      // 2',
        '      // 3',
        '      // 4',
        '      // 5',
        '      // 6',
        '      this.startTimer();',
        '    }',
        '  }',
        '  private startTimer() {',
        '    setInterval(() => this.tick(), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 0, skipped: 0, unguarded: 1 });
  });

  it('flags a setInterval whose only nearby guard belongs to a DIFFERENT method (Pattern A scoped to the enclosing body)', () => {
    const r = scanSource(
      src(
        'class S {',
        '  private guardedOne() {',
        "    if (process.env.NODE_ENV === 'test') return;",
        '    this.other();',
        '  }',
        '  private unguardedTwo() {',
        '    setInterval(() => this.tick(), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 0, skipped: 0, unguarded: 1 });
  });
});

describe('scanSource: brace counting ignores string and template contents', () => {
  it('a "}" inside a string literal does not hide the enclosing method', () => {
    const r = scanSource(
      src(
        'class S {',
        '  constructor() {',
        "    if (process.env.NODE_ENV !== 'test') {",
        '      this.startTimer();',
        '    }',
        '  }',
        ...FILLER,
        '  private startTimer() {',
        "    const close = '}';",
        '    setInterval(() => this.tick(close), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 1, skipped: 0, unguarded: 0 });
  });

  it('a "{" inside a string literal does not invent an enclosing block', () => {
    const r = scanSource(
      src(
        'class S {',
        '  constructor() {',
        "    if (process.env.NODE_ENV !== 'test') {",
        '      this.startTimer();',
        '    }',
        '  }',
        ...FILLER,
        '  private startTimer() {',
        '    const open = "{{";',
        '    setInterval(() => this.tick(open), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 1, skipped: 0, unguarded: 0 });
  });

  it('braces inside a multi-line template literal (including ${} interpolation) are ignored', () => {
    const r = scanSource(
      src(
        'class S {',
        '  constructor() {',
        "    if (process.env.NODE_ENV !== 'test') {",
        '      this.startTimer();',
        '    }',
        '  }',
        ...FILLER,
        '  private startTimer() {',
        '    const body = `{',
        '      "a": ${JSON.stringify({ b: 1 })}',
        '    }}}`;',
        '    setInterval(() => this.tick(body), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 1, skipped: 0, unguarded: 0 });
  });

  it('an apostrophe inside a comment does not open a string', () => {
    const r = scanSource(
      src(
        'class S {',
        '  constructor() {',
        "    if (process.env.NODE_ENV !== 'test') {",
        '      this.startTimer();',
        '    }',
        '  }',
        ...FILLER,
        '  private startTimer() {',
        "    const x = 1; // don't count this } brace",
        '    setInterval(() => this.tick(), 1000);',
        '  }',
        '}'
      )
    );
    expect(summary(r)).toEqual({ inMethod: 0, atCaller: 1, skipped: 0, unguarded: 0 });
  });
});

describe('findEnclosingMethod', () => {
  it('returns the method name, not an intervening control-flow keyword', () => {
    const lines = src(
      'class S {',
      '  private startTimer() {',
      '    if (this.enabled) {',
      '      setInterval(() => this.tick(), 1000);',
      '    }',
      '  }',
      '}'
    ).split('\n');
    expect(findEnclosingMethod(lines, 3)).toBe('startTimer');
  });

  it('returns null when there is no enclosing method', () => {
    expect(findEnclosingMethod(['setInterval(() => x(), 1);'], 0)).toBeNull();
  });
});

describe('isCalledFromGuardedSite', () => {
  it('requires a guard within 5 lines above a call of the method, other than its own declaration line', () => {
    const lines = [
      "if (process.env.NODE_ENV !== 'test') {",
      '  this.start();',
      '}',
      'private start() {',
    ];
    expect(isCalledFromGuardedSite(lines, 'start', 3)).toBe(true);
    expect(isCalledFromGuardedSite(['this.start();', 'private start() {'], 'start', 1)).toBe(false);
  });
});

describe('path classifiers', () => {
  it('isTestFile', () => {
    expect(isTestFile('/a/__tests__/x.ts')).toBe(true);
    expect(isTestFile('/a/x.test.ts')).toBe(true);
    expect(isTestFile('/a/x.spec.tsx')).toBe(true);
    expect(isTestFile('/a/services/x.ts')).toBe(false);
  });

  it('isHookFile', () => {
    expect(isHookFile('/a/hooks/x.ts')).toBe(true);
    expect(isHookFile('/a/useThing.ts')).toBe(true);
    expect(isHookFile('/a/services/Thing.ts')).toBe(false);
  });
});

describe('CLI on the real tree', () => {
  it('exits 0 and reports the guarded count', () => {
    const r = spawnSync('node', [SCRIPT], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/All \d+ service setInterval call\(s\) properly guarded/);
  });
});
