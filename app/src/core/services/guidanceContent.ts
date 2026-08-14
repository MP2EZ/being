/**
 * Guidance Content Loader
 * FEAT-404 slice 2 (carved out of FEAT-55)
 *
 * Loads and caches the authored JSON for one guidance domain, mirroring
 * `moduleContent.ts` — lazy `require`, in-memory cache, `asserts`-style validator.
 *
 * TWO DELIBERATE DIVERGENCES FROM THAT MIRROR, both load-bearing:
 *
 * 1. NO `preloadAll` EQUIVALENT. `moduleContent.ts` exports `preloadAllModules()` for
 *    call at app initialization. This file must not, and none should be added: guidance
 *    is a summon-on-demand surface that most sessions never open, so preloading it would
 *    spend app-launch budget (<2s) parsing content nobody asked for. There is no boot
 *    call site to add one to, and that is the point rather than an omission.
 *
 * 2. THIS MODULE MUST STAY OFF EAGER IMPORT GRAPHS. The `require` below is inside the
 *    switch, not at module scope, so importing this file costs nothing until a domain is
 *    actually requested. Two consequences worth stating because they are easy to undo:
 *    do NOT hoist the requires to the top, and do NOT add a `features/guidance/index.ts`
 *    barrel that re-exports this loader. A barrel re-export enlarges the eager module
 *    graph of every importer (FEAT-376), and `guidanceGate.ts` sits on a safety path — a
 *    suppressed reader must be routed to crisis resources BEFORE any of this content is
 *    loaded, which is only true while loading is lazy.
 *
 * The async signature is kept for parity with `loadModuleContent` even though `require`
 * is synchronous, so a consumer can `await` it the way `ModuleDetailScreen` does and a
 * future remote-content path stays open without a call-site change.
 */

import type { GuidanceContent, GuidanceDomain } from '@/features/guidance/types/guidance';

// Content cache (in-memory, persists for the app session).
const contentCache: Partial<Record<GuidanceDomain, GuidanceContent>> = {};

/**
 * Load authored guidance content for a domain.
 * Returns the cached instance if already loaded.
 *
 * Throws a NAMED error for the three domains that have no authored content yet. That
 * throw is the tested contract, not a defensive afterthought — see the note on the
 * switch below.
 */
export async function loadGuidanceContent(domain: GuidanceDomain): Promise<GuidanceContent> {
  const cached = contentCache[domain];
  if (cached) return cached;

  try {
    const content = loadGuidanceFromAssets(domain);
    validateGuidanceContent(content);
    contentCache[domain] = content;
    return content;
  } catch (error) {
    console.error(`[GuidanceContent] Failed to load ${domain}:`, error);
    throw new Error(`Failed to load guidance content: ${domain}`);
  }
}

/**
 * Resolve the JSON asset for a domain.
 *
 * TOTAL over `GuidanceDomain`, with a named throw for the three unauthored domains.
 * Deliberately NOT narrowed to the authored subset: `tsconfig` sets
 * `noFallthroughCasesInSwitch`, and typing the parameter as only `'conflict'` would move
 * the failure to compile time for callers that already hold a `GuidanceDomain` — which is
 * every caller, since the binding table and the gate are both total over the union. The
 * runtime throw is what a caller can actually handle, and it is pinned by a test.
 */
function loadGuidanceFromAssets(domain: GuidanceDomain): GuidanceContent {
  switch (domain) {
    case 'conflict':
      return require('../../../assets/guidance/guidance-conflict.json') as GuidanceContent;
    case 'career':
    case 'grief':
    case 'pain':
      throw new Error(`No authored guidance content for domain: ${domain}`);
    default:
      throw new Error(`Unknown guidance domain: ${String(domain)}`);
  }
}

/**
 * Validate the shape of authored guidance content.
 *
 * Asserts every REQUIRED field of `GuidanceContent` plus the nested shapes a renderer
 * would otherwise crash on. Deliberately does NOT require any of the six dormant optional
 * fields (`stageGate`, `lossFork`, `premeditatio`, `stageSequence`, `medicalCaveat`) —
 * those exist so later phases are content-adds, and requiring them would invert that.
 *
 * Written with explicit guards on every indexed read rather than `moduleContent.ts`'s
 * looser `field in content` loop, because this file compiles under `strict` +
 * `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` + `noPropertyAccessFromIndexSignature`.
 */
function validateGuidanceContent(content: any): asserts content is GuidanceContent {
  if (!content || typeof content !== 'object') {
    throw new Error('Guidance content is not an object');
  }

  const requiredFields = [
    'domain',
    'version',
    'validation',
    'microPractice',
    'protocol',
    'obstacles',
    'classicalAnchor',
  ];
  for (const field of requiredFields) {
    if (!(field in content)) {
      throw new Error(`Guidance content missing required field: ${field}`);
    }
  }

  if (!Array.isArray(content.validation) || content.validation.length === 0) {
    throw new Error('Guidance content must have at least one validation callout');
  }
  for (const box of content.validation) {
    if (!box || typeof box.content !== 'string' || typeof box.type !== 'string') {
      throw new Error('Invalid validation callout structure');
    }
  }

  const practice = content.microPractice;
  if (!practice || typeof practice.id !== 'string' || typeof practice.type !== 'string') {
    throw new Error('Invalid microPractice structure');
  }

  if (!Array.isArray(content.protocol) || content.protocol.length === 0) {
    throw new Error('Guidance content must have at least one protocol concept');
  }
  for (const concept of content.protocol) {
    if (!concept || typeof concept.title !== 'string' || typeof concept.content !== 'string') {
      throw new Error('Invalid protocol concept structure');
    }
  }

  if (!Array.isArray(content.obstacles)) {
    throw new Error('Guidance content obstacles must be an array');
  }

  const anchor = content.classicalAnchor;
  if (
    !anchor ||
    typeof anchor.text !== 'string' ||
    typeof anchor.author !== 'string' ||
    typeof anchor.source !== 'string'
  ) {
    throw new Error('Invalid classicalAnchor structure');
  }
}

/** Clear the content cache. For test isolation and memory management. */
export function clearGuidanceContentCache(): void {
  for (const key of Object.keys(contentCache)) {
    delete contentCache[key as GuidanceDomain];
  }
}
