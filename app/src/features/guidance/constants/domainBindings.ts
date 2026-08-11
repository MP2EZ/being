/**
 * Domain → principle bindings (FEAT-55, slice 1).
 *
 * Ratified by the `philosopher` lens against
 * `docs/product/stoic-mindfulness/applications/domain-specific.md` and the five
 * locked principles in `docs/product/stoic-mindfulness/INDEX.md`.
 *
 * TWO THINGS THIS TABLE IS NOT:
 *
 * 1. It is not a content restriction. `principles` lists what a tier may NAME.
 *    The conflict protocol legitimately draws on dichotomy-of-control material
 *    (Sphere Sovereignty) while naming Interconnected Living, because the source
 *    section opens by establishing "Foundation: Relational Presence (Principle 5)"
 *    and Interconnected Living is the only principle whose natural domain is
 *    interpersonal. Naming Sphere Sovereignty here instead would blunt
 *    cross-domain differentiation — it is already career's and pain's primary.
 *
 * 2. It is not a menu label source for a principle-first UI. `label` is
 *    deliberately situation-language ("Conflict with someone"), because the whole
 *    reason this surface exists is that a distressed reader will not translate
 *    "my mother died" into "review Radical Acceptance". Principles are revealed
 *    as a trailing label AFTER the guidance, never as the way in.
 */

import type { GuidanceDomain, GuidanceDomainBinding } from '../types/guidance';

/**
 * Principle names, spelled exactly as `docs/product/stoic-mindfulness/INDEX.md`
 * has them. Centralised so a rename is a one-line change rather than a grep.
 */
export const PRINCIPLE = {
  AWARE_PRESENCE: 'Aware Presence',
  RADICAL_ACCEPTANCE: 'Radical Acceptance',
  SPHERE_SOVEREIGNTY: 'Sphere Sovereignty',
  VIRTUOUS_RESPONSE: 'Virtuous Response',
  INTERCONNECTED_LIVING: 'Interconnected Living',
} as const;

export const DOMAIN_BINDINGS: Readonly<Record<GuidanceDomain, GuidanceDomainBinding>> = {
  conflict: {
    domain: 'conflict',
    label: 'Conflict with someone',
    principles: [PRINCIPLE.INTERCONNECTED_LIVING, PRINCIPLE.AWARE_PRESENCE],
  },
  career: {
    domain: 'career',
    label: 'Work or career pressure',
    principles: [PRINCIPLE.SPHERE_SOVEREIGNTY, PRINCIPLE.VIRTUOUS_RESPONSE],
  },
  grief: {
    domain: 'grief',
    label: 'Grief or loss',
    principles: [PRINCIPLE.RADICAL_ACCEPTANCE, PRINCIPLE.AWARE_PRESENCE],
  },
  pain: {
    domain: 'pain',
    label: 'Physical pain or illness',
    principles: [PRINCIPLE.AWARE_PRESENCE, PRINCIPLE.SPHERE_SOVEREIGNTY],
  },
};

/**
 * Domains with authored content. P0 ships conflict only.
 *
 * Kept separate from `DOMAIN_BINDINGS` rather than expressed as a flag on each
 * binding: the founder decision is that unbuilt domains are HIDDEN, not shown as
 * "coming soon", so a consumer should iterate this list and never have to
 * remember to filter the binding table.
 */
export const AVAILABLE_DOMAINS: readonly GuidanceDomain[] = ['conflict'];
