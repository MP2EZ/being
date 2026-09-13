/**
 * Tier 0 — validation, plus the safety escape clause (FEAT-433, slice 3a).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 ARRAY ORDER IS THE SAFETY CONTRACT. DO NOT SORT, FILTER, DEDUPE OR REORDER.
 *
 * `validation[1]` in the conflict content is the abuse/safety escape clause — the
 * "if you are afraid of the other person" branch that routes out of philosophy.
 * It is DUPLICATED here from the Tier 2 protocol on purpose: a reader in the
 * PHQ-9 15-19 gentle band is shown Tier 0 and Tier 1 ONLY, so a clause living
 * only in the protocol would be invisible to precisely the cohort most at risk.
 *
 * Slice 2 pins that ordering at the CONTENT layer. Nothing pinned it at the
 * PRESENTATION layer, which is the gap this component closes: if a `warning` box
 * renders identically to a `support` box, the ordering guarantee is intact in the
 * JSON and meaningless on screen.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `CalloutBox` has no `title` field, so the warning's condition lives inside
 * `content`. The visual weight therefore has to come from the container — hence a
 * variant map keyed on `type` rather than relying on the authored emoji, which is
 * data and not a styling contract.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CalloutBox } from '@/features/learn/types/education';
import { borderRadius, colorSystem, semantic, spacing, typography } from '@/core/theme';

interface Tier0Props {
  readonly validation: readonly CalloutBox[];
}

/**
 * Total over every `CalloutBox['type']`, including the two the conflict content
 * does not currently use. The loader's validator only checks that `type` is a
 * string, not that it is a member of the union, so an unrecognised value must
 * still render as something legible rather than an unstyled box.
 */
const VARIANTS: Record<CalloutBox['type'], { background: string; border: string }> = {
  warning: {
    background: colorSystem.status.warningBackground,
    border: colorSystem.status.warning,
  },
  support: {
    background: colorSystem.status.infoBackground,
    border: colorSystem.status.info,
  },
  tip: {
    background: colorSystem.status.infoBackground,
    border: colorSystem.status.info,
  },
  example: {
    background: colorSystem.gray[50],
    border: colorSystem.gray[300],
  },
};

/**
 * An unrecognised `type` renders as a WARNING, not as the neutral `example`.
 *
 * The loader validates only that `type` is a string, never that it is a member of the
 * union — so a single authoring typo (`warnign`) would otherwise render the abuse
 * escape clause as a gray box indistinguishable from an example, which is precisely
 * the failure this component exists to prevent, reached from the other direction.
 * An over-weighted unknown callout costs aesthetics; an under-weighted one costs
 * safety. Fail toward the louder one.
 */
const FALLBACK_VARIANT = VARIANTS.warning;

const Tier0: React.FC<Tier0Props> = ({ validation }) => (
  <View testID="guidance-tier0">
    {validation.map((box, index) => {
      const variant = VARIANTS[box.type] ?? FALLBACK_VARIANT;
      return (
        <View
          // Index is a legitimate key here precisely BECAUSE order is the contract:
          // these boxes are never reordered, filtered or keyed by identity.
          key={`${box.type}-${index}`}
          testID={`guidance-tier0-callout-${box.type}`}
          accessibilityRole="text"
          style={[
            styles.callout,
            { backgroundColor: variant.background, borderLeftColor: variant.border },
          ]}
        >
          <Text style={styles.icon}>{box.icon}</Text>
          <Text style={styles.content}>{box.content}</Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[12],
  },
  icon: {
    fontSize: typography.bodyRegular.size,
    marginRight: spacing[12],
  },
  content: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight,
    color: semantic.text.primary,
  },
});

export default Tier0;
