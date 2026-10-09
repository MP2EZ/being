/**
 * DEBUG-679 AC3 — every title that can head a circle-rendering PracticeTimer was measured.
 *
 * DEBUG-654 measured, on device at AX5, that the breathing circle and the Begin control share
 * the viewport under a header titled '3-Minute Breathing Space'. The header's height is line
 * count x width, so no character cap bounds it: a longer or differently-wrapping title can
 * push the circle off screen (`Daily Social Impact Reflection` does, at 390x844). A deep link
 * now picks its title from a closed set — the catalog's breathing-mode guided timers, plus the
 * fixed fallback — so that set is enumerable, and this pins it to the measured set.
 *
 * A new breathing guided-timer, a renamed one, or a changed FALLBACK_PRACTICE_TITLE turns this
 * red until DEBUG-654's capture is redone with that title and the title is added to
 * DEBUG_654_MEASURED_TITLES.
 */

import fs from 'fs';
import path from 'path';

import {
  FALLBACK_PRACTICE_TITLE,
  resolveLinkedPracticeParams,
} from '@/core/navigation/linkedPracticeParams';
import { DEBUG_654_MEASURED_TITLES } from '../helpers/debug654MeasuredTitles';

type CatalogPractice = { id: string; type: string; title: string; visualMode?: string };

const MODULES_DIR = path.resolve(__dirname, '../../assets/modules');
const practices: CatalogPractice[] = fs
  .readdirSync(MODULES_DIR)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(MODULES_DIR, f), 'utf8')).practices as CatalogPractice[]);

describe('DEBUG-679 AC3: circle-rendering PracticeTimer titles are DEBUG-654-measured', () => {
  it('control: the catalog has both a breathing and a contemplative guided timer', () => {
    const guided = practices.filter((p) => p.type === 'guided-timer');
    expect(guided.some((p) => p.visualMode === 'contemplative')).toBe(true);
    expect(guided.some((p) => p.visualMode !== 'contemplative')).toBe(true);
  });

  it('the resolver renders a circle for exactly the catalog breathing timers and the fallback', () => {
    for (const p of practices) {
      const linked = resolveLinkedPracticeParams(p.id);
      const rendersCircle = linked.visualMode !== 'contemplative';
      if (p.type === 'guided-timer') {
        expect(linked.title).toBe(p.title);
        expect(rendersCircle).toBe(p.visualMode !== 'contemplative');
      } else {
        expect(linked.title).toBe(FALLBACK_PRACTICE_TITLE);
        expect(rendersCircle).toBe(true);
      }
    }
    expect(resolveLinkedPracticeParams('probe').visualMode).toBe('breathing');
  });

  it('that title set equals the measured set', () => {
    const circleTitles = new Set([
      ...practices
        .filter((p) => p.type === 'guided-timer' && p.visualMode !== 'contemplative')
        .map((p) => p.title),
      FALLBACK_PRACTICE_TITLE,
    ]);
    expect([...circleTitles].sort()).toEqual([...DEBUG_654_MEASURED_TITLES].sort());
  });
});
