/**
 * DEBUG-653 — machinery for the per-host crisis-FAB clearance pins; each host asserts (a)–(e).
 * jest has no layout engine, so a frame is MODELLED as a stretch child of the host's padded
 * column minus its own margins, proven against the device measurement (d) before the sweep (c)
 * is trusted, and proven able to go red (e). Source reads are comment-stripped (DEBUG-390).
 */
import fs from 'fs';
import { ScrollView, StyleSheet } from 'react-native';
import type { RenderResult } from '@testing-library/react-native';

import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';

type Frame = { x: number; y: number; width: number; height: number };
type Sides = { left: number; right: number };
type Host = { raw: string; source: string };

const INSET = CRISIS_BUTTON_EXCLUSION_RECT.left;
const ZERO: Sides = { left: 0, right: 0 };
const DEVICE = { width: 375, height: 667 }; // the DEBUG-653 measurement: iPhone SE 3, iOS 18.6
const VIEWPORTS = [DEVICE, { width: 390, height: 844 }, { width: 402, height: 874 }];
const KEYS = 'paddingRight|marginEnd|marginStart|marginHorizontal|margin|width|alignSelf';
// Keys that move only content, outrank marginRight, or pin the extent; a sibling array member
// may not set any left/right margin either.
const CLOBBER = new RegExp(`\\b(${KEYS})\\s*:`);
const MEMBER_CLOBBER = new RegExp(`\\b(marginRight|marginLeft|${KEYS})\\s*:`);

const strip = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export function readHost(file: string): Host {
  const raw = fs.readFileSync(file, 'utf8');
  return { raw, source: strip(raw) };
}

/** A top-level StyleSheet entry, brace-balanced; '' when the key is not declared. */
function styleBlock(source: string, key: string): string {
  const at = source.search(new RegExp(`\\n  ${key}:\\s*\\{`));
  if (at === -1) return '';
  const open = source.indexOf('{', at);
  for (let i = open, depth = 0; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  return '';
}

const keysOf = (block: string): string[] => [...block.matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]);

export const flat = (style: unknown): Record<string, unknown> =>
  (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;

/** The host column's horizontal padding, read back off its one rendered ScrollView. */
export function hostPad(api: Pick<RenderResult, 'UNSAFE_getAllByType'>): Sides {
  const scrolls = api.UNSAFE_getAllByType(ScrollView);
  expect(scrolls).toHaveLength(1);
  const c = flat(scrolls[0].props.contentContainerStyle) as Record<string, number | undefined>;
  return {
    left: c.paddingLeft ?? c.paddingHorizontal ?? c.padding ?? 0,
    right: c.paddingRight ?? c.paddingHorizontal ?? c.padding ?? 0,
  };
}

/** `border` insets a TextInput: iOS reports its field inset by borderWidth (RCTTextInputComponentView.mm:367). */
function frameAt(width: number, pad: Sides, m: Sides, y: number, height: number, border = 0): Frame {
  return { x: pad.left + m.left + border, y, width: width - pad.left - pad.right - m.left - m.right - 2 * border, height };
}

function sweep(pad: Sides, m: Sides, heights: number[]): string[] {
  const offenders: string[] = [];
  for (const screen of VIEWPORTS) {
    for (const h of heights) {
      for (let y = -screen.height; y <= 2 * screen.height; y += 17) {
        if (intersectsCrisisButtonExclusion(frameAt(screen.width, pad, m, y, h), screen)) {
          offenders.push(`${screen.width}x${screen.height} h=${h} y=${y}`);
        }
      }
    }
  }
  return offenders;
}

/** (a) The rendered, flattened style carries the clearance as a MARGIN. */
export function expectMarginClearance(style: Record<string, unknown>, centred: boolean): void {
  expect(style.marginRight).toBe(INSET);
  expect(style.marginLeft).toBe(centred ? INSET : undefined);
  for (const k of ['paddingRight', 'marginHorizontal', 'marginEnd', 'marginStart']) expect(style[k]).toBeUndefined();
}

/** (b) The entry, comment-stripped: the derived constant, declared last, nothing clobbering. */
export function expectEntryShape(host: Host, key: string, centred: boolean): void {
  const block = styleBlock(host.source, key);
  const keys = keysOf(block);
  expect(block).toContain('marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left');
  expect(block).not.toMatch(CLOBBER);
  expect(keys[keys.length - 1]).toBe('marginRight');
  if (centred) expect(block).toContain('marginLeft: CRISIS_BUTTON_EXCLUSION_RECT.left');
  expect(keys.indexOf('marginLeft')).toBe(centred ? keys.length - 2 : -1);
  expect(host.source).toMatch(/import \{ CRISIS_BUTTON_EXCLUSION_RECT \} from '@\/features\/crisis\/constants\/crisisButtonGeometry'/);
  expect(host.source).not.toMatch(/\b72\b/);
}

/** (b, array hosts) Another member of the control's style array can clobber nothing. */
export function expectInertMember(host: Host, key: string): void {
  const member = styleBlock(host.source, key);
  expect(keysOf(member).length).toBeGreaterThan(0);
  expect(member).not.toMatch(MEMBER_CLOBBER);
}

/** (c) Zero intersections at every y from -H to 2H, every viewport, every height. */
export function expectSweepClear(pad: Sides, style: Record<string, unknown>, heights: number[]): void {
  // `?? 0`: an absent margin must model as zero, never as NaN arithmetic no comparison fails.
  const m = { left: (style.marginLeft as number) ?? 0, right: (style.marginRight as number) ?? 0 };
  expect(sweep(pad, m, heights)).toEqual([]);
}

/** (d) The measured pre-fix frame intersects, and the model with the insets removed reproduces it. */
export function expectModelFidelity(measured: Frame, pad: Sides, border = 0): void {
  expect(intersectsCrisisButtonExclusion(measured, DEVICE)).toBe(true);
  const modelled = frameAt(DEVICE.width, pad, ZERO, measured.y, measured.height, border);
  expect([modelled.x, modelled.width]).toEqual([measured.x, measured.width]);
}

/** (e) At inset 0 the predicate and every viewport's sweep go red, and each matcher still fires. */
export function expectLiveness(host: Host, key: string, measured: Frame, pad: Sides, border = 0): void {
  const bare = frameAt(DEVICE.width, pad, ZERO, measured.y, measured.height, border);
  expect(intersectsCrisisButtonExclusion(bare, DEVICE)).toBe(true);
  const zero = sweep(pad, ZERO, [measured.height, 200]);
  for (const { width, height } of VIEWPORTS) expect(zero.some((o) => o.startsWith(`${width}x${height} `))).toBe(true);
  expect(styleBlock(host.source, 'noSuchStyleKey')).toBe('');
  expect(keysOf(styleBlock(host.source, key)).length).toBeGreaterThan(0);
  expect(styleBlock(host.raw, key)).toContain('DEBUG-653');
  expect(styleBlock(host.source, key)).not.toContain('DEBUG-653');
  for (const bad of ['paddingRight: 4,', 'marginEnd: 4,', 'marginHorizontal: 4,', 'margin: 4,', 'width: 4,', "alignSelf: 'auto',"]) {
    expect(bad).toMatch(CLOBBER);
    expect(bad).toMatch(MEMBER_CLOBBER);
  }
  expect('marginRight: 0,').toMatch(MEMBER_CLOBBER);
  expect('marginRight: 72,').toMatch(/\b72\b/);
}
