/**
 * Erasure cancels scheduled notifications (DEBUG-763 AC4, landed by DEBUG-775).
 *
 * A local notification scheduled for the deleted account would fire after the
 * deletion: a reminder carrying the prior user's routine to whoever holds the device
 * next. Nothing schedules one today. This pin makes the first caller of
 * `scheduleNotificationAsync` bring a `cancelAllScheduledNotificationsAsync` into the
 * erasure path with it: in AccountDeletionService, or in a module that registers an
 * erasure reset (erasureResetRegistry).
 *
 * The scan is AST-based, so a commented-out call is invisible (DEBUG-390), and its
 * positive controls run against parsed source, never a string literal.
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import * as ts from 'typescript';

const APP = join(__dirname, '../..');

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

const parse = (file: string, text: string) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/** Calls to `name` (bare or as a member), and whether the file registers an erasure reset. */
function scan(sf: ts.SourceFile, name: string): { calls: number; registersReset: boolean } {
  let calls = 0;
  let registersReset = false;
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const called = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      if (called === name) calls += 1;
      if (called === 'registerErasureReset') registersReset = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { calls, registersReset };
}

const FILES = [...sourceFiles(join(APP, 'src')), join(APP, 'App.tsx')].map((file) => ({
  rel: relative(APP, file),
  sf: parse(file, readFileSync(file, 'utf8')),
}));
const ERASURE_SERVICE = 'src/core/services/privacy/AccountDeletionService.ts';

/** True when every scheduling caller is matched by a cancel the erasure path runs. */
function erasureCancelsWhatIsScheduled(files: { rel: string; sf: ts.SourceFile }[]): boolean {
  const schedulers = files.filter((f) => scan(f.sf, 'scheduleNotificationAsync').calls > 0);
  if (schedulers.length === 0) return true;
  return files.some(
    (f) =>
      scan(f.sf, 'cancelAllScheduledNotificationsAsync').calls > 0 &&
      (f.rel === ERASURE_SERVICE || scan(f.sf, '').registersReset),
  );
}

describe('scheduled notifications and account erasure', () => {
  it('has no scheduleNotificationAsync caller today', () => {
    expect(FILES.filter((f) => scan(f.sf, 'scheduleNotificationAsync').calls > 0).map((f) => f.rel)).toEqual([]);
  });

  it('requires an erasure-path cancel for any caller', () => {
    expect(erasureCancelsWhatIsScheduled(FILES)).toBe(true);
  });

  it('scanned the real tree (non-vacuous)', () => {
    expect(FILES.some((f) => f.rel === ERASURE_SERVICE)).toBe(true);
    expect(FILES.length).toBeGreaterThan(100);
  });

  describe('positive controls', () => {
    const scheduler = {
      rel: 'src/features/reminders/reminderService.ts',
      sf: parse('r.ts', `
        import * as Notifications from 'expo-notifications';
        export async function scheduleReminder() {
          await Notifications.scheduleNotificationAsync({ content: {}, trigger: null });
        }`),
    };

    it('fails when a caller appears with no cancel', () => {
      expect(erasureCancelsWhatIsScheduled([...FILES, scheduler])).toBe(false);
    });

    it('ignores a commented-out call', () => {
      const commented = { rel: 'x.ts', sf: parse('x.ts', '// await Notifications.scheduleNotificationAsync({});') };
      expect(scan(commented.sf, 'scheduleNotificationAsync').calls).toBe(0);
    });

    it('is satisfied by a cancel in a module that registers an erasure reset', () => {
      const reset = {
        rel: 'src/features/reminders/reminderErasure.ts',
        sf: parse('e.ts', `
          registerErasureReset('reminders', async () => {
            await Notifications.cancelAllScheduledNotificationsAsync();
          });`),
      };
      expect(erasureCancelsWhatIsScheduled([...FILES, scheduler, reset])).toBe(true);
    });

    it('is not satisfied by a cancel outside the erasure path', () => {
      const elsewhere = {
        rel: 'src/features/reminders/settings.ts',
        sf: parse('s.ts', 'export async function off() { await Notifications.cancelAllScheduledNotificationsAsync(); }'),
      };
      expect(erasureCancelsWhatIsScheduled([...FILES, scheduler, elsewhere])).toBe(false);
    });
  });
});
