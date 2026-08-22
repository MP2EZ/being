/**
 * Tier 2 — the fuller protocol, its obstacles, and the principle attribution
 * (FEAT-457, slice 3b).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 NOTHING ON THIS SURFACE IS BEHIND A TAP. That is the governing rule for the
 * whole guidance feature, and every decision below follows from it.
 *
 * `learn/tabs/OverviewTab.tsx` renders the SAME leaf types (`Concept`,
 * `Obstacle`) behind accordions, and that is correct THERE: Learn is a long,
 * browsable, progress-tracked module opened by a reader who came for the
 * philosophy. Guidance is a short surface summoned by someone in acute hardship.
 * Same data, different reader, opposite idiom. Do not "restore consistency" with
 * OverviewTab — the divergence is the design.
 *
 * The specific casualty of getting this wrong is `protocol[1].learnMore`. The
 * concept body states the dichotomy of control WITHOUT its corrective
 * ("you cannot control what another person thinks, feels, says, or does" plus
 * "a great deal of the suffering comes from trying anyway"). The corrective —
 * that recognising what you cannot reach is never a reason to remain in something
 * that is harming you — lives entirely in `learnMore`. Collapsing it ships the
 * quietist misreading as the DEFAULT reading and the correction as opt-in.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY UNIFORM TREATMENT RATHER THAN "inline iff index 1": a positional rule on
 * content data cannot be pinned. Reorder the JSON and the safety copy silently
 * moves behind a tap — the same failure class `Tier0.tsx` guards `validation`
 * against. A mixed treatment also changes the register of both halves, making the
 * inline one read as an alarm and the collapsed ones as optional trivia.
 *
 * Rendered only when `decision.allowTier2Plus === true`. The gate owns that; this
 * component is not gated internally and must never read assessment state.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Concept, Obstacle } from '@/features/learn/types/education';
import { borderRadius, colorSystem, semantic, spacing, typography } from '@/core/theme';

interface Tier2Props {
  readonly protocol: readonly Concept[];
  readonly obstacles: readonly Obstacle[];
  /**
   * Read from `DOMAIN_BINDINGS[domain].principles`, never inferred from content.
   *
   * The authored prose in `protocol[2].learnMore` already names both principles,
   * but that does NOT discharge the attribution: `learnMore` is an optional field
   * on versioned content data, so a future grief/career/pain file with no such
   * sentence would drop the naming with nothing to catch it. The binding table is
   * total over `GuidanceDomain` by construction — that totality is its purpose.
   */
  readonly principles: readonly [string, string];
}

/**
 * A concept and its extended teaching, always both, always inline.
 *
 * The `learnMore` passage is subordinated STRUCTURALLY (hairline rule + spacing)
 * and never by size. `OverviewTab` uses `bodySmall` for the same field; copying
 * that here would set a long, safety-adjacent passage in small type for a
 * distressed reader. Same reasoning as `GuidanceSuppressionNotice`'s footnote,
 * inverted: there structure carried subordination because colour was unavailable,
 * here because size reduction is unacceptable.
 *
 * NO "Learn more" LABEL. In this context that phrasing marks the passage as extra
 * credit, which is exactly the wrong signal for the anti-quietism corrective.
 */
const ProtocolConcept: React.FC<{ concept: Concept; index: number }> = ({ concept, index }) => (
  <View style={styles.concept} testID={`guidance-tier2-concept-${index}`}>
    <Text style={styles.conceptTitle} accessibilityRole="header">
      {concept.title}
    </Text>
    <Text style={styles.body}>{concept.content}</Text>
    {concept.learnMore ? (
      <View style={styles.learnMore} testID={`guidance-tier2-concept-${index}-more`}>
        <Text style={styles.body}>{concept.learnMore}</Text>
      </View>
    ) : null}
  </View>
);

/**
 * One reader concern, its response, and its practical exit.
 *
 * The `tip` ALWAYS renders. The response diagnoses; the tip prescribes. Dropping
 * `obstacles[0].tip` ("is this something I could change and am choosing not to?
 * If the answer is yes, the work in front of you is action, not acceptance")
 * would leave a validated reframe with no exit — which is quietism again, arrived
 * at by omission. `tip` is non-optional on `Obstacle`, so no guard is needed here
 * (unlike `Tier1`'s `instructions?`).
 */
const ObstacleEntry: React.FC<{ obstacle: Obstacle; index: number }> = ({ obstacle, index }) => (
  <View style={styles.obstacle} testID={`guidance-tier2-obstacle-${index}`}>
    <Text style={styles.obstacleQuestion} accessibilityRole="header">
      {obstacle.question}
    </Text>
    <Text style={styles.body}>{obstacle.response}</Text>
    <Text style={styles.obstacleTip} testID={`guidance-tier2-obstacle-${index}-tip`}>
      {obstacle.tip}
    </Text>
  </View>
);

const Tier2: React.FC<Tier2Props> = ({ protocol, obstacles, principles }) => (
  <View testID="guidance-tier2">
    {protocol.map((concept, index) => (
      <ProtocolConcept key={`concept-${index}`} concept={concept} index={index} />
    ))}

    {/*
      NOT headed "Obstacles". That frames the reader's concern as an impediment to
      the practice, which is backwards for `obstacles[0]` — whose entire point is
      that the concern is CORRECT. No intro line either, and specifically not
      OverviewTab's "tap any question to explore", which is false here.

      🔴 AUTHORED ORDER IS A CONTRACT, exactly as it is for Tier 0's `validation`.
      DO NOT SORT, FILTER, DEDUPE, TRUNCATE OR REORDER. `obstacles[0]` is the
      misreading-of-Stoicism guard and must be first, because a reader who has just
      been told "you cannot control what another person thinks, feels, says, or
      does" is at the peak of the quietist misreading at that exact moment.
    */}
    {obstacles.length ? (
      <View style={styles.obstacles} testID="guidance-tier2-obstacles">
        <Text style={styles.sectionHeading} accessibilityRole="header">
          Questions that come up
        </Text>
        {obstacles.map((obstacle, index) => (
          <ObstacleEntry key={`obstacle-${index}`} obstacle={obstacle} index={index} />
        ))}
      </View>
    ) : null}

    {/*
      The principle attribution — LAST in Tier 2, after the obstacles, before
      Tier 3.

      Not between the protocol and the obstacles: the obstacles are
      situation-language Q&A, and a classical term above them puts the classical
      term mid-stream, which is what `domainBindings.ts` clause 2 forbids. A
      trailing label satisfies "names its principle, never leads with it".

      NON-INTERACTIVE, deliberately. A tappable link into the Learn module would
      make the classical term the most visually salient element on the screen
      (link colour plus touch affordance) — inverting "never leading with the
      classical term" in WEIGHT while satisfying it in reading order — and would
      funnel a stateless summon-on-demand surface into progress-tracked Learn.

      Renders exactly the two members of the binding tuple, in table order. Do NOT
      add Sphere Sovereignty because `protocol[1]` is dichotomy-of-control
      material: `domainBindings.ts` clause 1 blesses drawing on a principle
      without naming it, and naming it here would blunt the cross-domain
      differentiation the table exists to preserve. This is a table read, never a
      content inference.
    */}
    <View style={styles.principles} testID="guidance-tier2-principles">
      <Text style={styles.principlesLabel}>PRINCIPLES</Text>
      <Text
        style={styles.principlesValue}
        testID="guidance-tier2-principles-value"
        accessibilityLabel={`Principles: ${principles.join(', ')}`}
      >
        {principles.join(' · ')}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  concept: {
    marginTop: spacing[24],
  },
  conceptTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  body: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight,
    color: semantic.text.primary,
  },
  // Structural subordination only — same size and line height as `body` above.
  learnMore: {
    marginTop: spacing[12],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  obstacles: {
    marginTop: spacing[24],
  },
  sectionHeading: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  obstacle: {
    marginTop: spacing[16],
    padding: spacing[16],
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
  },
  obstacleQuestion: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  obstacleTip: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight,
    color: semantic.text.primary,
    marginTop: spacing[12],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[300],
  },
  principles: {
    marginTop: spacing[24],
  },
  principlesLabel: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 1,
    color: semantic.text.secondary,
    marginBottom: spacing[4],
  },
  principlesValue: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
  },
});

export default Tier2;
