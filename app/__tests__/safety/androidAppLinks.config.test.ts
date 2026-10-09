/**
 * Android App Links capture only what the app can serve (DEBUG-649)
 *
 * The `autoVerify` intent filter in app.json and in the COMMITTED
 * AndroidManifest.xml declared `pathPrefix="/"` for being.fyi and
 * www.being.fyi, claiming every path on the domain. The website publishes 13
 * routes and only `/crisis` maps to a screen, so a tap on the published privacy
 * notice, terms or support page from an Android device with Being installed
 * could hand the link to an app that resolves it to nothing.
 *
 * Android is NOT CNG here (only iOS is, INFRA-280): app.json alone changes
 * nothing that ships, so both files are narrowed together and pinned to agree.
 *
 * Capture set = the intersection of what the resolver serves (linking.ts
 * `config.screens`) and what is declared externally reachable
 * (`DEEP_LINK_CONFIG.ALLOWED_PATHS`). It is a strict subset of the old "/", so
 * nothing gains new exposure, and it does not pre-empt DEBUG-636's pending
 * per-route rulings on the resolvable-but-undeclared tokens.
 *
 * Shape, measured against the real resolver: parameterised routes do not
 * resolve bare (`/assessment` -> nothing, `/assessment/phq9` -> AssessmentFlow),
 * so they are captured by `pathPrefix="/seg/"` only; leaf screens by an exact
 * `path`. Crisis gets both — `path="/crisis"` plus `pathPrefix="/crisis/"` —
 * which honours linking.ts's promise that routes added under `crisis/` inherit
 * the exemption, while never matching `/crisis-foo` the way a bare
 * `pathPrefix="/crisis"` would. Browser fallback is safe for crisis links in
 * any case: being-website's /crisis carries tel:988, sms:988 and chat.
 *
 * Android merges every <data> in one filter as a cross product (schemes x hosts
 * x paths), so one host-only entry per host gives both hosts the identical path
 * set — a narrowing cannot silently halve crisis-link coverage on one host.
 *
 * iOS (AC2): `apple-app-site-association` returns 404 on both hosts, so the
 * `applinks:` entitlement is inert and iOS captures nothing today. Authoring an
 * AASA is MAINT-161's; when it is, its `paths` must apply this same allowlist.
 *
 * WEBSITE_ROUTES below is a MANUAL cross-repo sync point: the two repos share no
 * CI. Update it when ~/dev/being-website adds a top-level route under app/(main).
 *
 * DEBUG-390 DISCIPLINE: 'matcher integrity' proves the checks go red on the
 * pre-fix `pathPrefix="/"` filter.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getStateFromPath } from '@react-navigation/native';

jest.mock('expo-linking', () => ({
  createURL: jest.fn((p: string) => `being://${p.replace(/^\//, '')}`),
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));
jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SECURITY: 'security' },
}));

import { linkingConfig } from '@/core/navigation/linking';
import { DEEP_LINK_CONFIG } from '@/core/services/security/DeepLinkValidationService';

/** Routes being-website publishes (app/(main)/*), verified 2026-09-24. */
const WEBSITE_ROUTES = [
  '/',
  '/accessibility',
  '/cookies',
  '/crisis',
  '/download',
  '/features',
  '/home',
  '/philosophy',
  '/privacy',
  '/privacy/california',
  '/privacy/multi-state',
  '/support',
  '/terms',
] as const;

const APP_ROOT = path.resolve(__dirname, '../..');
const EXPECTED_HOSTS = ['being.fyi', 'www.being.fyi'];

interface Capture {
  hosts: string[];
  paths: string[];
  prefixes: string[];
  patterns: string[];
}

type Datum = Record<string, string | undefined>;

function captureOf(data: Datum[]): Capture {
  const pick = (k: string) => data.map((d) => d[k]).filter((v): v is string => !!v).sort();
  return {
    hosts: pick('host'),
    paths: pick('path'),
    prefixes: pick('pathPrefix'),
    patterns: pick('pathPattern'),
  };
}

function appJsonCapture(): Capture {
  const expo = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8')).expo;
  const filters = (expo.android?.intentFilters ?? []).filter((f: { autoVerify?: boolean }) => f.autoVerify);
  expect(filters).toHaveLength(1);
  return captureOf(filters[0].data as Datum[]);
}

function manifestCapture(): Capture {
  const xml = fs.readFileSync(
    path.join(APP_ROOT, 'android/app/src/main/AndroidManifest.xml'),
    'utf8'
  );
  const blocks = xml.match(/<intent-filter[^>]*android:autoVerify="true"[^>]*>[\s\S]*?<\/intent-filter>/g) ?? [];
  expect(blocks).toHaveLength(1);
  const data = [...blocks[0].matchAll(/<data\s([^>]*?)\/>/g)].map((m) => {
    const d: Datum = {};
    for (const a of m[1].matchAll(/android:(\w+)="([^"]*)"/g)) d[a[1]] = a[2];
    return d;
  });
  return captureOf(data);
}

/** Would Android hand `p` (on a captured host) to the app? */
function captures(c: Capture, p: string): boolean {
  if (c.paths.length + c.prefixes.length + c.patterns.length === 0) return true; // host-only = every path
  return c.paths.includes(p) || c.prefixes.some((pre) => p.startsWith(pre));
}

/** Leaf route name the real resolver produces for `p`, or null. */
function resolvesTo(p: string): string | null {
  let state = getStateFromPath(p, linkingConfig.config as never) as
    | { routes: Array<{ name: string; state?: unknown }>; index?: number }
    | undefined;
  let leaf: string | null = null;
  while (state && state.routes) {
    const r = state.routes[state.index ?? state.routes.length - 1];
    leaf = r.name;
    state = r.state as typeof state;
  }
  return leaf;
}

const firstSegment = (p: string): string => p.split('/').filter(Boolean)[0] ?? '';

/** Every problem with a capture; empty means correct. */
function problems(c: Capture): string[] {
  const out: string[] = [];
  const screens = linkingConfig.config?.screens as Record<string, string | { path: string }>;
  const resolverSegments = new Set(
    Object.values(screens).map((v) => firstSegment(typeof v === 'string' ? `/${v}` : `/${v.path}`))
  );
  const allowedSegments = new Set(DEEP_LINK_CONFIG.ALLOWED_PATHS.map((p) => firstSegment(p)));

  if (c.paths.length + c.prefixes.length === 0) out.push('no path entries: captures every path');
  if (c.patterns.length) out.push(`pathPattern not permitted: ${c.patterns.join(', ')}`);
  for (const pre of c.prefixes) {
    if (!pre.endsWith('/') || pre === '/') out.push(`pathPrefix "${pre}" is not a segment-closed subtree`);
  }
  for (const p of [...c.paths, ...c.prefixes]) {
    const seg = firstSegment(p);
    if (!resolverSegments.has(seg)) out.push(`${p}: segment "${seg}" is not served by config.screens`);
    if (!allowedSegments.has(seg)) out.push(`${p}: segment "${seg}" is not in ALLOWED_PATHS`);
  }
  for (const p of c.paths) {
    if (!resolvesTo(p)) out.push(`exact path ${p} resolves to no screen`);
  }
  for (const route of WEBSITE_ROUTES) {
    if (captures(c, route) && !resolvesTo(route)) out.push(`published ${route} is captured but resolves to nothing`);
  }
  return out;
}

describe('DEBUG-649: Android App Links capture only what the app serves', () => {
  it('app.json and the committed manifest declare the identical capture', () => {
    expect(manifestCapture()).toEqual(appJsonCapture());
  });

  it('covers exactly the two verified hosts (app.being.fyi deliberately absent)', () => {
    expect(appJsonCapture().hosts).toEqual(EXPECTED_HOSTS);
  });

  it('every captured path is served, declared, and closed at a segment', () => {
    expect(problems(appJsonCapture())).toEqual([]);
  });

  it('/crisis stays captured and resolves to CrisisResources', () => {
    const c = appJsonCapture();
    for (const p of ['/crisis', '/crisis/']) {
      expect(captures(c, p)).toBe(true);
      expect(resolvesTo(p)).toBe('CrisisResources');
    }
    expect(captures(c, '/crisis-foo')).toBe(false);
  });

  it('the published legal and marketing pages fall through to the browser', () => {
    const c = appJsonCapture();
    for (const p of ['/', '/privacy', '/privacy/california', '/privacy/multi-state', '/terms', '/support', '/cookies']) {
      expect(captures(c, p)).toBe(false);
    }
  });
});

describe('DEBUG-649: matcher integrity', () => {
  it('the checks go red on the pre-fix pathPrefix="/" filter', () => {
    const preFix = captureOf([
      { scheme: 'https', host: 'being.fyi', pathPrefix: '/' },
      { scheme: 'https', host: 'www.being.fyi', pathPrefix: '/' },
    ]);
    expect(captures(preFix, '/privacy')).toBe(true);
    const found = problems(preFix);
    expect(found).toContain('pathPrefix "/" is not a segment-closed subtree');
    expect(found).toContain('published /privacy is captured but resolves to nothing');
  });

  it('a host-only filter is read as capturing everything', () => {
    const hostOnly = captureOf([{ scheme: 'https', host: 'being.fyi' }]);
    expect(captures(hostOnly, '/terms')).toBe(true);
    expect(problems(hostOnly)).toContain('no path entries: captures every path');
  });

  it('the resolver probe distinguishes a served path from an unserved one', () => {
    expect(resolvesTo('/assessment/phq9')).toBe('AssessmentFlow');
    expect(resolvesTo('/privacy')).toBeNull();
  });

  it('the website fixture is non-trivial and names /crisis', () => {
    expect(WEBSITE_ROUTES.length).toBeGreaterThanOrEqual(13);
    expect(WEBSITE_ROUTES).toContain('/crisis');
  });
});
