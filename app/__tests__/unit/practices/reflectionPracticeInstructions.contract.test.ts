/**
 * Every reflection practice ships instructions (DEBUG-650).
 *
 * ReflectionTimerScreen's contemplation copy tells the reader to "work through
 * the steps above" — the numbered instruction list. That is only true if the
 * list is there, and `instructions` is OPTIONAL on the practice type. The module
 * content is bundled JSON required statically by core/services/moduleContent.ts,
 * so asserting it here is a real guarantee rather than a runtime hope: a
 * reflection practice cannot ship without instructions while this is green.
 *
 * Without it, adding an instruction-less reflection practice would recreate the
 * defect DEBUG-650 fixed — copy pointing at an object the screen does not show.
 */
import * as fs from 'fs';
import * as path from 'path';

const MODULES_DIR = path.resolve(__dirname, '../../../assets/modules');

interface Practice {
  id?: string;
  type?: string;
  instructions?: unknown;
}

/** Every `type: 'reflection'` practice in a module document. */
function reflectionPractices(doc: unknown): Practice[] {
  const out: Practice[] = [];
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) {
      o.forEach(walk);
    } else if (o && typeof o === 'object') {
      const rec = o as Record<string, unknown>;
      if (rec.type === 'reflection' && typeof rec.id === 'string') out.push(rec as Practice);
      Object.values(rec).forEach(walk);
    }
  };
  walk(doc);
  return out;
}

/** A practice's defect, or null when its instructions are a non-empty list of non-empty strings. */
function instructionsDefect(p: Practice): string | null {
  const ins = p.instructions;
  if (!Array.isArray(ins) || ins.length === 0) return `${p.id}: no instructions`;
  if (ins.some((s) => typeof s !== 'string' || s.trim() === '')) return `${p.id}: blank instruction`;
  return null;
}

const modules = fs
  .readdirSync(MODULES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, doc: JSON.parse(fs.readFileSync(path.join(MODULES_DIR, f), 'utf8')) }));

describe('DEBUG-650: every reflection practice ships instructions', () => {
  const all = modules.flatMap(({ file, doc }) =>
    reflectionPractices(doc).map((p) => ({ file, p }))
  );

  it('finds the reflection practices (non-vacuity)', () => {
    // Seven as of DEBUG-650. A drop means the walker stopped matching, not that
    // practices were removed — re-point it before lowering this.
    expect(all.length).toBeGreaterThanOrEqual(7);
  });

  it('each has a non-empty list of non-empty instructions', () => {
    const defects = all
      .map(({ file, p }) => {
        const d = instructionsDefect(p);
        return d ? `${file} ${d}` : null;
      })
      .filter(Boolean);
    expect(defects).toEqual([]);
  });

  it('the checker still goes red (matcher integrity)', () => {
    expect(instructionsDefect({ id: 'x', type: 'reflection' })).toBe('x: no instructions');
    expect(instructionsDefect({ id: 'x', type: 'reflection', instructions: [] })).toBe(
      'x: no instructions'
    );
    expect(instructionsDefect({ id: 'x', type: 'reflection', instructions: ['a', ' '] })).toBe(
      'x: blank instruction'
    );
    expect(reflectionPractices({ practices: [{ id: 'y', type: 'reflection' }] })).toHaveLength(1);
  });
});
