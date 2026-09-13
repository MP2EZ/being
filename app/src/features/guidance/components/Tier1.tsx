/**
 * Tier 1 — the micro-practice, rendered in place (FEAT-433, slice 3a).
 *
 * WHY THIS RENDERS INSTEAD OF LAUNCHING A TIMER, WHICH IS THE OBVIOUS THING.
 * Launching one is structurally impossible with the P0 content, not merely
 * undesirable, and an implementer reaching for `resolvePracticeRoute` will only
 * discover that after building toward it:
 *   · `microPractice` in `guidance-conflict.json` has `type: 'reflection'` and six
 *     `instructions`, but NO `duration` — and `Practice.duration` is optional.
 *   · The ReflectionTimer route requires `duration: number` AND a `moduleId` from
 *     a closed union of five learn slugs, none of which is guidance-shaped.
 * Making it launchable is a content-and-route change for a later slice, not wiring.
 *
 * Guidance is stateless by design (`types/guidance.ts`), so there is deliberately
 * no completion control, no streak, no progress and no score anywhere here. The
 * instructions are steps to read, and the last one is an explicit permission
 * rather than an obligation — a checkbox would misread it as a task.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Practice } from '@/features/learn/types/education';
import { borderRadius, colorSystem, semantic, spacing, typography } from '@/core/theme';

interface Tier1Props {
  readonly practice: Practice;
}

const Tier1: React.FC<Tier1Props> = ({ practice }) => (
  <View testID="guidance-tier1" style={styles.card}>
    <View style={styles.header}>
      {practice.icon ? <Text style={styles.icon}>{practice.icon}</Text> : null}
      <Text style={styles.title} accessibilityRole="header">
        {practice.title}
      </Text>
    </View>

    <Text style={styles.description}>{practice.description}</Text>

    {/* `instructions` is optional on Practice, so guard rather than assume. */}
    {practice.instructions?.length ? (
      <View style={styles.steps} testID="guidance-tier1-instructions">
        {practice.instructions.map((step, index) => (
          <View key={`${practice.id}-step-${index}`} style={styles.step}>
            <Text style={styles.stepMarker}>·</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    padding: spacing[16],
    marginTop: spacing[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  icon: {
    fontSize: typography.bodyRegular.size,
    marginRight: spacing[8],
  },
  title: {
    flex: 1,
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
  },
  description: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight,
    color: semantic.text.secondary,
    marginBottom: spacing[12],
  },
  steps: {
    marginTop: spacing[4],
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[12],
  },
  stepMarker: {
    // NOT an ordinal. `instructions[4]` reads "This is an option to have available,
    // not a step you owe anyone" — the authored copy uses the word "step" to
    // DISCLAIM step-hood, and numbering asserts it back. A numbered list is the most
    // directive list form available, handed to a reader whose content works hard to
    // defuse the sense that there is a procedure to get right. The order is still
    // meaningful and still preserved; what is dropped is the claim that these are
    // countable, completable tasks.
    //
    // Also NOT semibold: semantic.text.secondary is a deliberate alias of primary
    // (DEBUG-323), so weight here would make the marker MORE salient than the step
    // text it introduces, not less.
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    marginRight: spacing[12],
    minWidth: spacing[16],
  },
  stepText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight,
    color: semantic.text.primary,
  },
});

export default Tier1;
