/**
 * DEEP LINK REACHABILITY — DRIFT PIN (DEBUG-636)
 *
 * Four sources answer "can an external link reach this screen?", and before
 * DEBUG-636 they disagreed 7-and-7 while a comment claimed they agreed:
 *   1. linking.ts `config.screens`      — the resolver (what CAN resolve)
 *   2. `DEEP_LINK_CONFIG.ALLOWED_PATHS` — the enforcing allowlist (what MAY)
 *   3. linking.ts `DEEP_LINK_REACHABILITY` — the per-route ruling and its reason
 *   4. `extractNavigationParams`'s screenMap — test-only, historically drift-prone
 * plus the Android App Links capture (DEBUG-649): a path the OS hands the app
 * must be one the allowlist then lets through, or the app claims a verified link
 * and drops it — for /crisis, skipping being-website's tel:988 fallback too.
 *
 * The ruling table is the exemption list: a token may sit in exactly one of the
 * first two sources only if the table says why. Adding a screen to
 * `config.screens` without ruling it fails here, which is the point — a new
 * screen must not become externally reachable (or silently blocked) by default.
 */

import * as fs from 'fs';
import * as path from 'path';
import { linkingConfig, DEEP_LINK_REACHABILITY, CRISIS_PATH_SEGMENT } from '@/core/navigation/linking';
import DeepLinkValidationService, {
  DEEP_LINK_CONFIG,
} from '@/core/services/security/DeepLinkValidationService';

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

type ScreenConfig = string | { path: string };

const baseOf = (p: string): string => `/${p.split('/').filter(Boolean)[0] ?? ''}`;

const screens = Object.entries(
  linkingConfig.config?.screens as Record<string, ScreenConfig>,
).map(([route, cfg]) => ({ route, path: typeof cfg === 'string' ? cfg : cfg.path }));

const served = new Set(screens.map((s) => baseOf(s.path)));
const allowed = new Set<string>(DEEP_LINK_CONFIG.ALLOWED_PATHS);
const table = Object.entries(DEEP_LINK_REACHABILITY);
const tokensRuled = (ruling: string) => table.filter(([, r]) => r.ruling === ruling).map(([t]) => t);

/** The route a bare `being://<token>` means: the exact-path screen, else the parameterised one. */
function routeFor(token: string): string | undefined {
  const bare = token.replace(/^\//, '');
  return (screens.find((s) => s.path === bare) ?? screens.find((s) => baseOf(s.path) === token))?.route;
}

beforeEach(() => {
  DeepLinkValidationService.clearSecurityEvents();
});

type Ruling = { ruling: string; reason: string };

/** Every disagreement between the sources and the ruling table; empty means reconciled. */
function problems(srv: Set<string>, alw: Set<string>, rulings: Record<string, Ruling>): string[] {
  const out: string[] = [];
  for (const t of srv) if (!rulings[t]) out.push(`config.screens base ${t} has no ruling`);
  for (const t of alw) if (!rulings[t]) out.push(`ALLOWED_PATHS entry ${t} has no ruling`);
  for (const [t, r] of Object.entries(rulings)) {
    const s = srv.has(t);
    const a = alw.has(t);
    if (!s && !a) out.push(`${t}: stale ruling, in neither source`);
    if (r.reason.trim().length < 20) out.push(`${t}: no reason given`);
    if (r.ruling === 'EXTERNALLY_REACHABLE' && !(s && a)) out.push(`${t}: ruled reachable but served=${s} allowed=${a}`);
    if (r.ruling === 'NOT_REACHABLE' && !(s && !a)) out.push(`${t}: ruled not reachable but served=${s} allowed=${a}`);
    if (r.ruling === 'LEGACY_NO_SCREEN' && !(!s && a)) out.push(`${t}: ruled legacy but served=${s} allowed=${a}`);
    if (!['EXTERNALLY_REACHABLE', 'NOT_REACHABLE', 'LEGACY_NO_SCREEN'].includes(r.ruling)) out.push(`${t}: unknown ruling ${r.ruling}`);
  }
  return out;
}

describe('DEBUG-636: the sources reconcile through the ruling table', () => {
  it('config.screens, ALLOWED_PATHS and DEEP_LINK_REACHABILITY agree', () => {
    expect(problems(served, allowed, DEEP_LINK_REACHABILITY)).toEqual([]);
  });
});

describe('DEBUG-636: the validator agrees with the ruling', () => {
  const link = (token: string) => `being://${token.replace(/^\//, '')}`;

  it.each(tokensRuled('NOT_REACHABLE'))('%s is blocked with DISALLOWED_PATH', (token) => {
    const result = DeepLinkValidationService.validateDeepLink(link(token));
    expect(result.isValid).toBe(false);
    expect(result.errors.map((e) => e.code)).toEqual(['DISALLOWED_PATH']);
  });

  it.each([...tokensRuled('EXTERNALLY_REACHABLE'), ...tokensRuled('LEGACY_NO_SCREEN')])(
    '%s validates',
    (token) => {
      expect(DeepLinkValidationService.validateDeepLink(link(token)).isValid).toBe(true);
    },
  );

  // Source 4. Supersedes dailyLoopDeepLink.test.ts's unasserted "the three
  // path->screen sources of truth agree".
  it.each(tokensRuled('EXTERNALLY_REACHABLE'))('screenMap sends %s to the route config.screens does', (token) => {
    const nav = DeepLinkValidationService.extractNavigationParams(
      DeepLinkValidationService.validateDeepLink(link(token)),
    );
    expect(nav.screen).toBe(routeFor(token));
  });

  // FEAT-298 6c deleted these screenMap entries on purpose: the link validates and
  // resolves to nothing, so the app stays where it opened.
  it.each(tokensRuled('LEGACY_NO_SCREEN'))('screenMap resolves %s to no screen', (token) => {
    const nav = DeepLinkValidationService.extractNavigationParams(
      DeepLinkValidationService.validateDeepLink(link(token)),
    );
    expect(nav.screen).toBeNull();
  });
});

describe('DEBUG-636: Android App Links capture only reachable routes', () => {
  const expo = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf8'),
  ).expo;
  const captured: string[] = (expo.android?.intentFilters ?? [])
    .filter((f: { autoVerify?: boolean }) => f.autoVerify)
    .flatMap((f: { data: Array<Record<string, string | undefined>> }) => f.data)
    .flatMap((d: Record<string, string | undefined>) => [d.path, d.pathPrefix])
    .filter((p: string | undefined): p is string => !!p);

  it('reads a non-empty capture that includes /crisis', () => {
    expect(captured).toEqual(expect.arrayContaining(['/crisis']));
  });

  it.each(captured)('captured %s is ruled EXTERNALLY_REACHABLE', (p) => {
    expect(DEEP_LINK_REACHABILITY[baseOf(p)]?.ruling).toBe('EXTERNALLY_REACHABLE');
  });
});

describe('DEBUG-636: the crisis subtree stays deliverable as it grows', () => {
  const crisisPaths = screens.map((s) => s.path).filter((p) => baseOf(p) === `/${CRISIS_PATH_SEGMENT}`);

  it('finds the crisis route', () => {
    expect(crisisPaths).toContain(CRISIS_PATH_SEGMENT);
  });

  // The crisis carve-out skips the per-segment charset check, so a `:param` under
  // crisis/ would reach its screen unchecked. Give it a parse, or rule it here.
  it.each(crisisPaths)('crisis route %s declares no path param', (p) => {
    expect(p).not.toContain(':');
  });

  it.each(crisisPaths)('crisis route %s validates as a deep link', (p) => {
    expect(DeepLinkValidationService.validateDeepLink(`being://${p}`).isValid).toBe(true);
  });
});

describe('DEBUG-636: drift-pin integrity', () => {
  const reason = 'a reason long enough to count as one';

  it('goes red on a new screen nobody ruled', () => {
    const srv = new Set([...served, '/brand-new-screen']);
    expect(problems(srv, allowed, DEEP_LINK_REACHABILITY)).toContain(
      'config.screens base /brand-new-screen has no ruling',
    );
  });

  it('goes red when a NOT_REACHABLE token is allowlisted anyway', () => {
    const rulings = { '/x': { ruling: 'NOT_REACHABLE', reason } };
    expect(problems(new Set(['/x']), new Set(['/x']), rulings)).toEqual([
      '/x: ruled not reachable but served=true allowed=true',
    ]);
  });

  it('goes red when a reachable token is dropped from the allowlist', () => {
    const rulings = { '/x': { ruling: 'EXTERNALLY_REACHABLE', reason } };
    expect(problems(new Set(['/x']), new Set(), rulings)).toEqual([
      '/x: ruled reachable but served=true allowed=false',
    ]);
  });

  it('goes red on a stale row', () => {
    const rulings = { '/gone': { ruling: 'LEGACY_NO_SCREEN', reason } };
    expect(problems(new Set(), new Set(), rulings)).toContain('/gone: stale ruling, in neither source');
  });

  it('derives the served set from parameterised and nested routes', () => {
    expect([...served]).toEqual(expect.arrayContaining(['/', '/crisis', '/module', '/subscription']));
    expect(routeFor('/subscription')).toBe('Subscription');
    expect(routeFor('/module')).toBe('ModuleDetail');
  });

  it('rules crisis reachable', () => {
    expect(DEEP_LINK_REACHABILITY['/crisis']?.ruling).toBe('EXTERNALLY_REACHABLE');
  });
});
