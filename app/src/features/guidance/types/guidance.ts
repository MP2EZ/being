/**
 * Domain-specific guidance types (FEAT-55, slice 1).
 *
 * "Guidance" is the summon-on-demand surface for a named hardship — conflict,
 * career, grief, pain — as opposed to `learn/`, which is browsed by principle and
 * carries progress state. The distinction matters to the data model: guidance is
 * stateless and dormant, so it deliberately has no completion/streak/progress
 * shape anywhere in this file.
 *
 * SCHEMA RELATIONSHIP TO `learn/`: `GuidanceContent` is a strict SUBSET of
 * `ModuleContent` and reuses its leaf interfaces, but does NOT import
 * `ModuleContent` itself. Importing it would drag in the progress-tracked module
 * vocabulary (status, completed sections, practice counts) that guidance must not
 * have, and would couple this surface to every future Learn schema change.
 */

import type {
  CalloutBox,
  ClassicalQuote,
  Concept,
  DevelopmentalStage,
  Obstacle,
  Practice,
} from '@/features/learn/types/education';

/**
 * The hardships this surface can be summoned for.
 *
 * Only `conflict` has authored content in P0. The others are declared now so the
 * binding table, the gate and the content loader are all total over the union
 * from the start — adding them later becomes a content-add rather than a type
 * change that ripples through every switch.
 */
export type GuidanceDomain = 'conflict' | 'career' | 'grief' | 'pain';

/**
 * The four-tier ladder, shallowest first.
 *
 * Tier 0 validates the user's experience and carries the caveat; Tier 1 is the
 * micro-practice that is the default landing content; Tier 2 is the fuller
 * protocol; Tier 3 is the classical anchor. The gate can cap the ladder at
 * Tier 1 without any tier needing to know why.
 */
export type GuidanceTierId = 'tier0' | 'tier1' | 'tier2' | 'tier3';

/** How much of the ladder a reader may be shown right now. */
export type GuidanceAccessLevel = 'full' | 'gentle' | 'suppressed';

/**
 * Where a suppressed reader is sent instead.
 *
 * Shaped as a route descriptor rather than a bare screen name so the `source`
 * tag travels with it. Every existing crisis entry point in the app tags its
 * origin (`RootCrisisButton`, `AssessmentResults`, `EnhancedAssessmentQuestion`,
 * `AssessmentIntroduction`, `DailyLoopStepScreen`), and downstream crisis
 * telemetry reads it to attribute where a crisis view came from.
 */
export interface GuidanceCrisisRoute {
  readonly screen: 'CrisisResources';
  readonly params: { readonly source: 'guidance_gate' };
}

/**
 * The gate's verdict. Deliberately flat and serialisable — it is produced by a
 * pure function and consumed by presentation code that must not re-derive any
 * of it.
 */
export interface GuidanceAccessDecision {
  readonly level: GuidanceAccessLevel;
  /** Present if and only if `level` is `'suppressed'`. */
  readonly crisisRoute?: GuidanceCrisisRoute;
  /** Tier 2 and Tier 3 may render. False for `gentle` and `suppressed`. */
  readonly allowTier2Plus: boolean;
  /**
   * Premeditatio malorum (negative visualization) may be offered.
   *
   * Separate from `allowTier2Plus` because it is the one practice that can harm
   * if shown to the wrong reader — it is opt-in, pre-loss only, and never shown
   * to the bereaved or to anyone at or above the PHQ-9 support floor.
   */
  readonly allowPremeditatio: boolean;
}

/**
 * The binding from a hardship to the principles that address it.
 *
 * `principles` are the ones a tier may NAME. Content may legitimately draw on
 * others without naming them — the conflict protocol leans on dichotomy-of-control
 * material while naming Interconnected Living — so this is a labelling contract,
 * not a content restriction.
 */
export interface GuidanceDomainBinding {
  readonly domain: GuidanceDomain;
  /** Situation-first label, e.g. "Conflict with someone". Never a principle name. */
  readonly label: string;
  readonly principles: readonly [string, string];
}

/**
 * Authored guidance content for one domain.
 *
 * The later-phase fields are declared OPTIONAL now, and their render branches are
 * written dormant, so that adding career/grief/pain is a content-add rather than
 * a schema migration across every consumer.
 */
export interface GuidanceContent {
  readonly domain: GuidanceDomain;
  readonly version: string;

  /** Tier 0 — validation plus the caveat. Always rendered, at every access level
   *  except `suppressed`. */
  readonly validation: readonly CalloutBox[];
  /** Tier 1 — the micro-practice that is the default landing content. */
  readonly microPractice: Practice;
  /** Tier 2 — the fuller protocol, with its obstacles inline. */
  readonly protocol: readonly Concept[];
  readonly obstacles: readonly Obstacle[];
  /** Tier 3 — the classical anchor. */
  readonly classicalAnchor: ClassicalQuote;

  // ---- Dormant in P0. Declared so later phases are content-adds. ----

  /** Gates content on the reader's self-assessed developmental stage. */
  readonly stageGate?: DevelopmentalStage;
  /** Grief: splits pre-loss from in-loss content. */
  readonly lossFork?: {
    readonly preLoss: readonly Concept[];
    readonly inLoss: readonly Concept[];
  };
  /** Grief/pain: the opt-in negative-visualization practice, pre-loss only. */
  readonly premeditatio?: Practice;
  /** Pain: orders content by stage of the condition. */
  readonly stageSequence?: readonly GuidanceTierId[];
  /** Pain: the "complements medical care" caveat. */
  readonly medicalCaveat?: CalloutBox;
}
